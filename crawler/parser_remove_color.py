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



def main():
  remove_line_with_color()



if __name__ == '__main__':
  main()