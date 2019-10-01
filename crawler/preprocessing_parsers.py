def remove_line_with_color():
  colorFile = open("color_list.txt","r")
  colorList = []
  while True:
    line = colorFile.readline()
    if not line: break
    colorList.append(line.split('\n')[0].lower())
  print(colorList)

  resultFile = open("title_extract_result.txt","r")
  outputFile = open("color_remove_result.txt","w")

  lineCount = 0
  while True:
    line = resultFile.readline()
    if not line: break
    lineCount += 1
    print(lineCount)

    writeFlag = True
    for color in colorList:
      if(line.lower().find(color) != -1):
        writeFlag = False
        break
    if(writeFlag):
      outputFile.write(line)

  resultFile.close()
  outputFile.close()

def extract_item_name():
  filename = input()
  inputFile = open(filename,"r")
  outputFile = open("title_extract_result.txt","w")

  itemCount = 0
  lineFromDash = 0
  while True:
    line = inputFile.readline()
    if not line: break

    if(line[0] == '-'):
      lineFromDash = 0
      itemCount += 1
      print(itemCount)
    else:
      lineFromDash += 1
      #Item Name
      if(lineFromDash == 2):
        outputFile.write(line)
  
  outputFile.close()
  inputFile.close()

def remove_empty_items():
  filename = input("filename: ")
  inputFile = open(filename,"r")
  outputFile = open("empty_item_removed.txt","w")

  item = []
  count = 0
  empty_count = 0
  while True:
    line = inputFile.readline()
    if not line: break

    if(line[0] == '-'):
      
      print(count)
      count += 1

      if(len(item) == 0):
        continue
      
      isEmpty = False
      for eachLine in item:
        if(eachLine == '\n'):
          isEmpty = True
          empty_count += 1
          break
      
      if(not isEmpty):
        for eachLine in item:
          outputFile.write(eachLine)
        outputFile.write('-------\n')
      item.clear()
    else:
      item.append(line)
  outputFile.close()
  inputFile.close()
  print('Removed %d empty items!' %empty_count)

def main():
  #remove_empty_items()
  extract_item_name()
  remove_line_with_color()

if __name__ == '__main__':
  main()