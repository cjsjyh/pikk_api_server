import { RunSingleSQL, ExtractFieldFromList } from "./promiseUtil"

export async function ReplaceImageWithResolutions() {
  //Get table rows
  let imageUrls = await RunSingleSQL('SELECT rec."titleImageUrl" as "imageUrl" from "RECOMMEND_POST" rec')
  ExtractFieldFromList(imageUrls, "imageUrl")
  var filtered = imageUrls.filter(function(el) {
    return el != null
  })
  //Extract S3 Key
  filtered.forEach(url => {
    url = url.replace("https://fashiondogam-images.s3.ap-northeast-2.amazonaws.com/", "")
  })
  console.log(filtered)

  //Download From S3

  //Detect Image Size

  //Resize Images

  //Upload Image

  //Delete Image
}
