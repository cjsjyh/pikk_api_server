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

export function getFormatDate(date) {
  var year = date.getFullYear() //yyyy
  var month = 1 + date.getMonth() //M
  month = month >= 10 ? month : "0" + month //month 두자리로 저장
  var day = date.getDate() //d
  day = day >= 10 ? day : "0" + day //day 두자리로 저장
  return year + "" + month + "" + day
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
