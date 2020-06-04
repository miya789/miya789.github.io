# miya789.github.io

## Format

### Setup

0. `yarn`をインストール

1. Package のインストール

```
yarn
```

- 上記コマンドで`node_modules`に以下がインストールされる．
  - "husky": "^4.2.5",
  - "lint-staged": "^10.2.2",
  - "prettier": "^2.0.5"

### Usage

- 全コードのフォーマットをしたい場合は下記コマンドで全てチェックし修正も可能であれば行われる．
- 修正不可能な場合はエラーが出るが，行も表示されるのでこれを元に修正する．

```
yarn run all-fmt
```

### Background

- 以上の設定を行った場合は，`git commit`前にフォーマットが起動するようになる．

- `git commit` 時に強制的に LF へ
  1. `git commit`
  2. `.git/hooks/pre-commit(husky)`: 詳しくは不明
  3. `"husky"` -> `"hooks"` -> `"pre-commit"` -> `"lint-staged"`
  4. `"lint-staged"`
  5. `"prettier --write", "git add"`

```json:該当コード箇所
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,json,css,md,html}": ["prettier --write", "git add"]
  }
}
```

### Customize

#### Prettier

- `package.json`の下記部分により仕様の変更可能．

```json:package.json(一部)
{
  ...,
  "prettier": {
    "arrowParens": "always",
    "tabWidth": 2,
    "singleQuote": true,
    "trailingComma": "none",
    "semi": true,
    "printWidth": 1000
  },
  ...
}
```

- 以下の設定により除外設定が可能．
  - `./.prettierignore`: 対象から除外するファイル
  - `// prettier-ignore`: 対象から除外するコード要素

#### Eslint

- JavaScript も本格的に使う場合は，こちらと`Prettier`を併用するのが主流らしい
  > Prettier はコードフォーマッタのため、ESLint のような構文チェック機能はない。
  > そのため、コードの整形は Prettier が行い、コードの構文チェックは ESLint が行うように併用する。
  - 参考: [Prettier 入門 ～ ESLint との違いを理解して併用する～](https://qiita.com/soarflat/items/06377f3b96964964a65d#eslintとの併用)

### Note

#### `package.json`の Path の記法

- `package.json`における Path の記法に一癖あるらしい．よく知らない．

  > 普段意識せずに使っている、"\*\*"と書けばネストしたディレクトリを含む、というような glob は globstar というシェル拡張を使っているそうです。

  > 記事執筆時点の Mac だとデフォルトで bash のバージョンが 3 系なので、そもそも globstar が使えません。(globstar が追加されたのはバージョン 4 から)

  > その状態で"\*\*"を含む glob を書くと、2 段以上ネストされたディレクトリに対応できなくなったわけです。

  > では Bash のバージョンを 4 系に上げ、globstar を有効にすればそれだけで使えるようになるかというと、そういうわけでもありませんでした。

  > どうも、npm scripts に書いたスクリプトは sh -c に続く形で渡されるようです。
  > このとき、元のシェルセッションで globstar を有効にしていたとしても、新しく作られたシェルのセッションでは globstar が無効になってしまっていました。

```json:package.json(NG)
"scripts": {
  "test": "mocha src/**/*.spec.ts"
},
```

- 部分的に正しいが powershell では動かないらしい

```json:package.json(NG:Powershellで動かないらしい)
"scripts": {
  "test": "mocha 'src/**/*.spec.ts'"
},
```

- Poweshell でも動作させたい場合は「\"」が望ましいらしい．

```json:package.json(OK)
"scripts": {
  "test": "mocha \"src/**/*.spec.ts\""
},
```

- 参考: [OS に依存しない形で npm scripts に glob を書く](https://qiita.com/k3nNy_51rcy/items/f674d671d2d045b91821)
- 参考: [Why you should always quote your globs in NPM scripts.](https://medium.com/@jakubsynowiec/you-should-always-quote-your-globs-in-npm-scripts-621887a2a784)

#### lint-staged vs pre-commit vs pretty-quick

- Prettier 公式のトップページでは`preety-quick`が勧められているが，シェアは`lint-staged`の方が高いらしい．

  - 参考: [lint-staged vs pre-commit vs pretty-quick](https://www.npmtrends.com/lint-staged-vs-pre-commit-vs-pretty-quick)

#### pre-commit の表記

- ブログでは古いバージョンの`husky`を使っている為上の場合が多いが，`husky: "^4.2.5"`では以下．
  - 参考: [typicode/husky: Git hooks made easy woof! - GitHub](https://github.com/typicode/husky)

```diff
{
  "scripts": {
-   "precommit": "npm test",
-   "commitmsg": "commitlint -E GIT_PARAMS"
  },
+ "husky": {
+   "hooks": {
+     "pre-commit": "npm test",
+     "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
+   }
+ }
}
```
