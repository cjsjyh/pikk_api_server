export function ConvertToCommentTableName(targetName: string): string {
  let tableName = ""
  if (targetName == "RECOMMEND") tableName = '"RECOMMEND_POST_COMMENT"'
  else if (targetName == "COMMUNITY") tableName = '"COMMUNITY_POST_COMMENT"'

  return tableName
}

export function GetBoardName(name: string): string {
  let boardName = ""
  if (name == "COMMUNITY") boardName = "COMMUNITY_POST"
  else if (name == "RECOMMEND") boardName = "RECOMMEND_POST"

  return boardName
}
