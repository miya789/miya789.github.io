# 所感
- 基礎文法が分かり難い

## Array

```
var s[]int
var s = []int{1, 2, 4, 8, 16, 32, 64, 128}
```

### Slice
- appendでlenとcapが一致しないのは何故?

### Closure
- a,bの状態を受け渡して計算している?
```
package main

import "fmt"

// fibonacci is a function that returns
// a function that returns an int.
func fibonacci() func() int {
	a, b := 0, 1
	return func() int {
		a, b = b, a+b
		return a
	}
}

func main() {
	f := fibonacci()
	for i := 0; i < 10; i++ {
		fmt.Println(f())
	}
}
```

- `ポインタレシーバ`
  - ???
  > これはレシーバの型が、ある型 T への構文 *T があることを意味します。 （なお、 T は *int のようなポインタ自身を取ることはできません）

### Interface
- Interfaceによりクラスの継承に似た事が可能
- Interface通りの定義がされているならば，動的に型が基礎型？の物として判定される
  - 例: `Error()`の関数が実装された構造体は`error`
	- 型の形が似ている場合はどうなる？
- structで定義したerrorは何故戻り値errorで返せるが，型アサーションは通らないのか？

#### 参考
- [Go言語における埋め込みによるインタフェースの部分実装パターン](https://qiita.com/tenntenn/items/e04441a40aeb9c31dbaf)

### 型
- 名前の無い型は`型リテラル`
  - 例: `[]byte`, `*int`, `map[string]string`, `interface{}`

### Question
- for i, v := range pow


## Error
### Wrap
- Go 1.13から，`fmt.Errorf("failed to request: %w", err)` でerrorをwrap可能に

#### 参考
- [Goの新しいerrors パッケージ xerrors](https://qiita.com/sonatard/items/9c9faf79ac03c20f4ae1)
- [xerrorsパッケージがWrapメソッドではなく : %w でラップする理由](https://qiita.com/sonatard/items/7b15258fa19f939b1323)

## 参考
- (A Tour of Go)[https://go-tour-jp.appspot.com/]
