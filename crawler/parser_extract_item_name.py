def main():
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

if __name__ == '__main__':
  main()