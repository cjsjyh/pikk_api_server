export function DoPropertiesExist(parent: any, propertyNames: string[], operator: "AND" | "OR", isArray: boolean = false): boolean {
  let checkAND = true
  let checkOR = false

  propertyNames.forEach(property => {
    //If Property exists
    if (Object.prototype.hasOwnProperty.call(parent, property) && parent[property] != null) {
      if (isArray) {
        if (parent[property].length == 0) checkAND = false
        else checkOR = true
      } else {
        checkOR = true
      }
    } else {
      checkAND = false
    }
  })

  if (operator == "AND") return checkAND
  else if (operator == "OR") return checkOR
}
