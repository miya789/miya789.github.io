# 初めに
> Qiita…初カキコ…ども…
> 俺みたいな中3でログ見てる腐れ野郎、他に、いますかっていねーか、はは
> it’a true wolrd．狂ってる？それ、400ね。

と言う訳で，駆け出しエンジニアのすなるQiita記事というものを書いてみたいと思います! 
(お手柔らかにお願いします……)

# 動機
エラーのハンドリングを全体でカスタマイズする動機は，大きく分けて以下の2つがあると思われます．
  1. Webページで，独自のエラーページに誘導したい
  2. APIで，独自エラーをハンドリングしたい

恐らく2.に関してはアドホックにその場で対応すれば十分な場合が多く，あまり恩恵は得られないかもしれません．
どちらかというと，大規模なWebページを作る際に独自のエラーページを使用する事が多く，
また独自エラーハンドリングの書き方で調べて出て来るのが[^1]でしたので，
1の需要が大きい様に思われます．

しかし，**「APIが大規模化した場合」**且つ**「独自エラーをハンドリングしたい場合」**は重要性が高まると期待されます．
他の方の記事でも近いものがありました[^2]が，ここまで複雑にするつもりが無かったので簡素化したいと思います．特に様々なエラーが飛び交う環境だと一つ一つ改修するのは柔軟性が失われ大変な気がします．
従って需要は見込めないと言えども，本記事では主に2に関して書きます．

(日本語の解説が少なくてあれだったので自分用(便利な言葉)にも書き残して置きます．)

# デフォルト動作の理解
<details><summary>**Defaultで呼ばれるエラーハンドラーはこちら**
場当たり的にブログのコピペばかりをすると全体像を捉えられず，整合性に掛けて無駄の多いパッチワークによるキメラコードが生まれるので，まずは公式を頑張って読んでみたいと思います．
とは言え，間違いがあるかもしれない御戯れコーナーですので，忙しい人は次項目へどうぞ．</summary><div>

## echoのソースコードを(一部)読んでみた
場当たり的にブログのコピペばかりをすると全体像を捉えられず，パッチワークによるキメラコードが生まれるので，まずは公式を頑張って読んでみたいと思います．
とは言え，間違いがあるかもしれない御戯れコーナーですので，忙しい人は次項目へどうぞ．

公式曰く，よくある使われ方は以下らしいです[^1]．

```Go
package main

import (
  "net/http"

  "github.com/labstack/echo"
  "github.com/labstack/echo/middleware"
)

// Handler
func hello(c echo.Context) error {
  return c.String(http.StatusOK, "Hello, World!")
}

func main() {
  // Echo instance
  e := echo.New()

  // Middleware
  e.Use(middleware.Logger())
  e.Use(middleware.Recover())

  // Routes
  e.GET("/", hello)

  // Start server
  e.Logger.Fatal(e.Start(":1323"))
}
```
17行目で初めに`Echo`インスタンス`e`を作成し，その`e`に様々なライブラリで用意されたものをセットしています(20~27行目)．
ここでエラーが起き得るのは，handlerの`hello()`ですがここで投げられた`error`はどこへ行くのか調べてみたいと思います．

ではライブラリの中を見てみましょう． 最新の[echo.go (2020.06.20 現在)](https://github.com/labstack/echo/blob/43e32ba83d638c73a415609f26d513eda30033ee/echo.go) を用います．
すると`ServeHTTP()` 中，622~625行目にて以下の様な記述があります．
(`"net/http"`の`server.go`がリクエストを受け付けているようですが，難しかったので割愛しここから見てみます．)

```Go:echo.go(622~625)
	// Execute chain
	if err := h(c); err != nil {
		e.HTTPErrorHandler(err, c)
	}
```
恐らくここの`h`にリクエストに対応したハンドラー (上の例だと`hello()`) が入っており，ハンドラーの投げるエラーが`e.HTTPErrorHandler(err, c)`によってハンドリングされるのだと思います．

では `HTTPErrorHandler()` の正体に迫ってみたいと思います．

ここで思い出したいのが，`New()`です．これによって`Echo`のインスタンスが作成され，色々と設定していました．デフォルト値はどうなっているのでしょうか?

```Go:echo.go(296~320)
func New() (e *Echo) {
	e = &Echo{
		Server:    new(http.Server),
		TLSServer: new(http.Server),
		AutoTLSManager: autocert.Manager{
			Prompt: autocert.AcceptTOS,
		},
		Logger:   log.New("echo"),
		colorer:  color.New(),
		maxParam: new(int),
	}
	e.Server.Handler = e
	e.TLSServer.Handler = e
	e.HTTPErrorHandler = e.DefaultHTTPErrorHandler
	e.Binder = &DefaultBinder{}
	e.Logger.SetLevel(log.ERROR)
	e.StdLogger = stdLog.New(e.Logger.Output(), e.Logger.Prefix()+": ", 0)
	e.pool.New = func() interface{} {
		return e.NewContext(nil, nil)
	}
	e.router = NewRouter(e)
	e.routers = map[string]*Router{}
	return
}
```
長過ぎて全て読んだ初心者の方は今頃発狂していると思われますが，
重要なのは`e.HTTPErrorHandler = e.DefaultHTTPErrorHandler`で，これによってエラーが起きたら`DefaultHTTPErrorHandler()`が実行されるようになっているようです．

つまり通常は`e.HTTPErrorHandler`に`DefaultHTTPErrorHandler()`が設定されていてこれが使われるっぽいです．
では，`DefaultHTTPErrorHandler()`を読んでみましょう．

```Go:echo.go(344~381)
// DefaultHTTPErrorHandler is the default HTTP error handler. It sends a JSON response
// with status code.
func (e *Echo) DefaultHTTPErrorHandler(err error, c Context) {
	he, ok := err.(*HTTPError)
	if ok {
		if he.Internal != nil {
			if herr, ok := he.Internal.(*HTTPError); ok {
				he = herr
			}
		}
	} else {
		he = &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: http.StatusText(http.StatusInternalServerError),
		}
	}

	// Issue #1426
	code := he.Code
	message := he.Message
	if e.Debug {
		message = err.Error()
	} else if m, ok := message.(string); ok {
		message = Map{"message": m}
	}

	// Send response
	if !c.Response().Committed {
		if c.Request().Method == http.MethodHead { // Issue #608
			err = c.NoContent(he.Code)
		} else {
			err = c.JSON(code, message)
		}
		if err != nil {
			e.Logger.Error(err)
		}
	}
}
```

(色々Issueがあるみたいですね．挑戦すればcontributorになれるんですかね．)

3パートあるので分割して見てみます．
詳しい事は分かりませんが，入力で受け取った`err`が`HTTPError`かどうか判定を行い，もし該当すればStatusCodeを持っている筈なので取り出します．しかし違った場合は，StatusCodeが500の`HTTPError`インスタンスを作ってくれるそうです．`Msg` は`http`ライブラリが提供する500のデフォルトっぽいですね．

```Go
he, ok := err.(*HTTPError)
if ok {
  if he.Internal != nil {
    if herr, ok := he.Internal.(*HTTPError); ok {
      he = herr
    }
  }
} else {
  he = &HTTPError{
    Code:    http.StatusInternalServerError,
    Message: http.StatusText(http.StatusInternalServerError),
  }
}
```

疲れたのとあまり関係なので残り2パートは省きますが，メッセージを取り出してMap化し，それを基にレスポンスの形式を良い感じにJSON形式にしてくるみたいです，凄いですね．
(`e.Debag` が一番よく分かりませんでした．デバッガで見てたんですがここで大変なエラーが起きて大変でした．)

## 公式が最大手
### Error Handling
公式[^1]にエラーハンドリングについての記述があったので見てみましょう．
近年流行りのDeepLと協力して日本語に訳しました．

> Echoは、ミドルウェアやハンドラからエラーを返すことで、HTTPのエラー処理を一元化することを提唱しています。エラーハンドラを一元化することで、統一された場所から外部サービスにエラーを記録し、カスタマイズされたHTTPレスポンスをクライアントに送ることができるようになります。

> 標準のエラーを返すこともできますし、echo.*HTTPErrorを返すこともできます。

> 例えば、基本的な 認証ミドルウェアが無効な認証情報を検出した場合、401 - Unauthorized エラーを返し、現在の HTTP リクエストを中止します。

```Go
e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
  return func(c echo.Context) error {
    // Extract the credentials from HTTP request header and perform a security
    // check

    // For invalid credentials
    return echo.NewHTTPError(http.StatusUnauthorized, "Please provide valid credentials")

    // For valid credentials call next
    // return next(c)
  }
})
```
> メッセージを指定せずにecho.NewHTTPError()を使用することもできます。その場合，ステータスのテキストはエラーメッセージとして使用されます．例えば、"Unauthorized"といった具合です。

まずコードに関して，無名関数がハンドラーとして設定されていますね．
これは`next echo.HandlerFunc`を受け取って`echo.HandlerFunc`を返す関数らしいです．
で，どんな関数を返すかというとまたもや無名関数で，どうやら`echo.Context`を引数に`error`を返すよくあるハンドラーを定義しているようです．因みにここでは見て来た様に，関数自体をやり取りしているのでこれだけでは動かないですね．
更に`// Extract the credentials from HTTP request header and perform a security`の辺りで恐らく認証情報をヘッダーから取り出す動作をするように見えます．
そしてコメントアウトされていない`echo.NewHTTPError(http.StatusUnauthorized, "Please provide valid credentials")`がエラーを生成して其の場で`error`として返していますね．
もしコメントアウトされている`next(c)`が元気に動作していれば，引数にとっているこの関数の返すerrorが返されることになるでしょう．

恐らく例にも上がっているように，英語での名称がエラメッセージとして使われるだけの簡素なものということでしょう．

### Default HTTP Error Handler
> Echo は、エラーをJSON形式で送信するデフォルトのHTTPエラーハンドラを提供します。

```json
{
  "message": "error connecting to redis"
}
```
> 標準エラーの場合、レスポンスは 500 - Internal Server Error として送信されますが、デバッグモードで実行している場合は、元のエラーメッセージが送信されます。errorが*HTTPErrorの場合、レスポンスは提供されたステータスコードとメッセージで送信されます。ロギングがオンになっている場合、エラーメッセージも記録されます。

例にもありましたが，エラメッセージを何も書かないと上の様なJSONの`"message"`のvalueが`“Unauthorized”`などで返って来ると言うことだと思います．一番上の例だと`echo.NewHTTPError(http.StatusUnauthorized, "Please provide valid credentials")`を返しているので，

```json
{
  "message": "Please provide valid credentials"
}
```

が返って来ます．

### Custom HTTP Error Handler
> カスタムHTTPエラーハンドラはe.HTTPErrorHandlerを介して設定できます。

> ほとんどの場合、デフォルトのHTTPエラーハンドラで十分です。しかし、異なるタイプのerrorを捕捉し、それに応じてアクションを実行したい場合には、カスタムHTTPエラーハンドラが便利です。また、エラーページやただのJSONレスポンスなど、カスタマイズしたレスポンスをクライアントに送信することもできます。

##### Error Pages
> 以下のカスタムHTTPエラーハンドラは、異なるタイプのerrorのためのエラーページを表示し、errorをログに記録する方法を示しています。エラーページの名前は <CODE>.html のようにしてください。このプロジェクト https://github.com/AndiDittrich/HttpErrorPages を参考にしてください。

```Go
func customHTTPErrorHandler(err error, c echo.Context) {
	code := http.StatusInternalServerError
	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
	}
	errorPage := fmt.Sprintf("%d.html", code)
	if err := c.File(errorPage); err != nil {
		c.Logger().Error(err)
	}
	c.Logger().Error(err)
}

e.HTTPErrorHandler = customHTTPErrorHandler
```
本稿の趣旨とは逸れますが，これはこれで便利で楽しそうですね．

デフォルトで`InternalServerError`のステータスコードを設定して，もしerrにステータスコードがあれば取り出して反映する．そしてステータスに対応するhtmlファイルを読み込んで来る．最後にロギングするという感じでしょうか．

詳しい説明は挙げられたリポジトリにデモがあるのでWebページを作る人は見てみると良いでしょう．

</div></details>
<br>

# 簡素化した独自のエラーハンドラーの作成
前項で，凡そどのようにエラーがデフォルトでハンドリングされるのか分かりました．
では，早速エラーのハンドリングをカスタマイズしてみましょう．

背景として，処理の中で`MyError1`, `MyError2`, `MyError3` があると仮定しましょう．
また独自のエラーを本当に実装するとコードがQiitaでは読み難いのでエラーハンドラーに焦点を絞っています．

これらに関して`Handler`毎に中で扱うのは大変なので共通して分岐させるようにします．
**Handlerで拾ったエラーを上に投げたら勝手に良い感じに処理してくれる感じ**ですね．
特にWrapしまくったエラーを毎回取り出すとソースコードが大氾濫して可読性が下がるので，纏めたいところです．

```Go:example_server.go
package main

import (
	"net/http"

	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
)

type (
	// Server wraps Echo to customize.
	Server struct {
		echo *echo.Echo
	}
)

// Handler
func hello(c echo.Context) error {
	return c.String(http.StatusOK, "Hello, World!")
}

// MyErrorHandler wraps DefaultHTTPErrorHandler.
func (svr *Server) MyErrorHandler(err error, c echo.Context) {
	// Unwrap error
	if e, ok := err.(interface{ Unwrap() error }); ok {
		err = e.Unwrap()
	}

	// Switch response
	switch err.(type) {
	case *MyError1:
		// err = echo.NewHTTPError(http.StatusNotFound, err.Error())
		err = echo.NewHTTPError(http.StatusNotFound)
	case *MyError2:
	case *MyError3:
		err = echo.NewHTTPError(http.StatusBadRequest)
	}

	// DefaultHTTPErrorHandler
	svr.echo.DefaultHTTPErrorHandler(err, c)
}

func main() {
	// Echo instance
	svr := new(Server)
	e := echo.New()
	svr.echo = e

	// Middleware
	svr.echo.Use(middleware.Logger())
	svr.echo.Use(middleware.Recover())

	// HTTPErrorHandler
	svr.echo.HTTPErrorHandler = svr.MyErrorHandler

	// Routes
	svr.echo.GET("/", hello)

	// Start server
	svr.echo.Logger.Fatal(e.Start(":1323"))
}

```

これでエラーのハンドリングができる筈です．今回は挨拶関数`hello()`なので人間と違ってエラーが起きる事は無いですが，ここを変えて動かしてみると良いんじゃないかと思います．

更に定義した`MyErrorHandler()`に関して取り出してみてみましょう．

```Go:example_server.go(MyErrorHandler部分)
// MyErrorHandler wraps DefaultHTTPErrorHandler.
func (svr *Server) MyErrorHandler(err error, c echo.Context) {
  // Unwrap error
  if e, ok := err.(interface{ Unwrap() error }); ok {
    err = e.Unwrap()
  }

  // Switch response
  switch err.(type) {
  case MyError1:
    // err = echo.NewHTTPError(http.StatusNotFound, err.Error())
    err = echo.NewHTTPError(http.StatusNotFound)
  case MyError2:
  case MyError3:
    err = echo.NewHTTPError(http.StatusBadRequest)
  }

  // DefaultHTTPErrorHandler
  svr.echo.DefaultHTTPErrorHandler(err, c)
}
```

大きく3パートで構成されます．
初めのUnwrap部分で一番下のエラーを取り出しswitchで比較できる形にした後，switchで`err`を`HTTPError`に変えてしまい，さら以後にそれを`DefaultHTTPErrorHandler`に処理してもらいます．
追ってそれぞれについてみてみます．

```Go:example_server.go(Unwrap部分)
if e, ok := err.(interface{ Unwrap() error }); ok {
  err = e.Unwrap()
}
```
- 「(^o^) `Unwrap()`って何です?」「`if err != nil { return err }` で返って来たエラーしかハンドリングしないんだが?」という方は恐らくここは不要の筈だと思います．
 
<details><summary>Wrapとは</summary><div>

- ここはGo 1.13以降の機能`fmt.Errof("%w", err)`[^3]などでWrapされたエラーから中身を取り出して一番下の中身を取り出しています．
-  正しい使い方を正直分かっていないですが，私はエラーの起きた箇所を追跡する為にWrapしがちなので，最深層のエラーをこれで取り出しすのが日課です．これでWrapが実装されていないエラーにも柔軟に対応できますね．
</div></details>
<br>

```Go:example_server.go(switch部分)
switch err.(type) {
case MyError1:
  // err = echo.NewHTTPError(http.StatusNotFound, err.Error())
  err = echo.NewHTTPError(http.StatusNotFound)
case MyError2:
case MyError3:
  err = echo.NewHTTPError(http.StatusBadRequest)
}
```
- おなじみのエラー解体ショーですね．ここでは，デフォルトで500に介錯されるエラーを所望の`StatusCode`に変換しています．
  - 例えば，`MyError1`は404，`MyError2`,`MyError3`は400に解釈されます．
  - これにで後は任せて`DefaultHTTPErrorHandler`で良い具合にエラーメッセージなどを作成してもらえます．


```Go:example_server.go(DefaultHTTPErrorHandler部分)
svr.echo.DefaultHTTPErrorHandler(err, c)
```

- 自分でエラーメッセージを生成する必要がなかったので，そっくり其の儘流用します．
  - 一応 `echo.NewHTTPError(http.StatusNotFound, err.Error())` で独自エラーのメッセージを使用できるらしいです．よく分かりませんが．
  - `MyErrorHandler`をechoには生やせないのでServerでechoをWrapしています．
- 一応頑張ればエラーメッセージも作成できると思いますが，一説によるとエラーから内部の構造を調べられる可能性があるので，エラーメッセージはデフォルトの儘が良いかもしれないです[^4]．
  - よくある例は，「ログインに失敗した時のエラーでアカウントの存在がバレる」や「空いているポートが調べられる」などですかね．

# 結論
以上からめでたく，APIが独自エラーのハンドリングを行えるようになりました．
(Goを触って数か月のにわかなので間違っている箇所があればご指摘頂けると有難いです．)

とはいえ，やはり同じ400では何を直すべきかハンドリングできず困る場合もあると思います．
**なんで怒っているか分からないパワハラ系上司**のAPIを実装しても皆が不幸になる[^5]ので，セキュリティ的には問題が無い少し詳細な程度のエラーメッセージを生成すると良いかもしれないですね．

# 参考
エラーの作り方に関しては以下の記事にお世話になりました．
分かり易かったので紹介させていただきます．

[^1]: [Error handling in Echo | Echo is a high performance, extensible, minimalist web framework for Go (Golang).](https://echo.labstack.com/guide/error-handling)
[^2]: [echoのAPIサーバ実装とエラーハンドリングの落とし穴](https://qiita.com/usk81/items/5f2bcfe06eb83830ee55)
[^3]: [Go1.13のerrorsにWrapの機能が入ったので勉強がてらまとめる](https://nametake.github.io/posts/2019/10/30/unwrap-interface/)
[^4]: [9-3. エラーメッセージからの情報暴露](https://www.ipa.go.jp/security/awareness/vendor/programmingv1/b09_03.html)
[^5]: [キレる上司に憂鬱…「怒っている人」から自分をどう守るか？](https://gentosha-go.com/articles/-/20000)
