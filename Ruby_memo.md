# 基礎
- 不明
  - [] 全て[1]
- 参考
  1. [Ruby基礎文法](https://qiita.com/Fendo181/items/eb2cb17f32d99aa01f59)

# ClassMethod
- 不明
  - [] 全て [1]
- 参考
  1. [Rubyのクラスメソッドをclass << selfで定義している理由（翻訳）](https://techracho.bpsinc.jp/hachi8833/2017_12_21/49467)

# Model
## scope
- 利点
  - 再利用が可能
  - コントロールに適切 ← ？

## validate
- 不明
  - [] `EachValidatorクラス`[1]
- 参考
  1. [カスタムバリデーションの作成方法まとめ](https://qrunch.net/@hikey/entries/HZv7DnkeDThTjl5b)

# 多重代入
- 不明
  - [] `ブロックの代わりに lambda を使う場合、引数の数に要素の数が満たないと死ぬ`[1]
  - [] `名前付き引数`[1]
- 参考
  1. [Rubyの多重代入あれこれまとめ](https://qiita.com/yancya/items/c557864f307d429bbde4)

# Editor
- Rubymine
  - 有料

# 拡張機能
- 参考
  1. [VSCodeでRuby On Railsを快適に書きたい](https://qiita.com/sensuikan1973/items/219a843e4654e6c2e10d)

## 気になった
- `<<`
  - シフト演算子
  - 特異クラス
  - [あとで読む](https://qiita.com/fukumone/items/95117f418dec590ebbc8)

- 二重ループ回避
  - `zip`


# Rspec
- let
  - 使えるのはcontext以下まで
  - it以下は使えない
- model::scope
  - 特徴
    - ActiveRecordの一部
    - 複数のクエリを纏めたメソッド
  - 課題
    - 複数のクエリを一つのメソッドとして纏められる
