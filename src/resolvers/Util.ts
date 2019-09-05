export async function SequentialPromiseValue<T, U>(arr: T[], func: Function, args: Array<U> = []): Promise<Array<any>> {
  let resultArr = new Array<T>(arr.length)
  await Promise.all(
    arr.map((item: any, index: number) => {
      return new Promise((resolve, reject) => {
        func(item, args)
          .then((result: any) => {
            resultArr[index] = result
            resolve()
          })
          .catch((e: Error) => reject(e))
      })
    })
  )
  return resultArr
}

/*
async function SequentialPromise<T>(arr: Promise<{}>[]): Promise<Array<T>> {
  let resultArr = new Array<any>(arr.length)
  await Promise.all(
    arr.map((item: Promise<{}>, index: number) => {
      return new Promise((resolve, reject) => {
        item.then((result: any) => {
          resultArr[index] = result
          resolve()
        })
      })
    })
  )
  return resultArr
}
*/
