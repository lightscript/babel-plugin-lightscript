obj = {
  method() -> assert(this === obj)
}

obj.method?()
