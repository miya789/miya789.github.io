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
### Question
- for i, v := range pow


## 参考
- (A Tour of Go)[https://go-tour-jp.appspot.com/]
