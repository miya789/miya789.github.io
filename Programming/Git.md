# Git memo

### Revert

- `git merge`を取り消す場合
  - 1: マージされる側のブランチ
  - 2: マージする側のブランチ

```
git revert -m 1 <commit>
```
