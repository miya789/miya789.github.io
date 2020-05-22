# Git memo

### Revert

- `git merge`を取り消す場合

```
git revert -m 1 <commit>
```

- オプション
  - 1: マージされる側のブランチ
  - 2: マージする側のブランチ
- 以下の例の場合はコマンドは`git revert -m 1 1459267`で`dbc65f4`に戻れる

```bash: Branch graph example
*   1459267 - Merge pull request #4 from branch3
|\
| * 344fd52 - (branch3) Add sentence
| * 2b30235 - add file
* | dbc65f4 - add revert commit2
* | f0b0a91 - add revert commit 1
```
