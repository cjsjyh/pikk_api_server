def main():
  parseLogLine()

def parseLogLine():
  #filename = input("[log file name] : ")
  fileList = open("npm-out.log", "r")
  outputResult = open("parsedLog.csv","w+")

  lastMinute = -1
  count = 0
  while True:
    line = fileList.readline()
    if not line: break

    if(line[0] != '['):
      continue
    
    timeStr = line.split(']')[0]
    timeStr = timeStr[1:len(timeStr)]

    date = timeStr.split(' ')[0]
    time = timeStr.split(' ')[1]

    dateSplit = date.split('-')
    year = dateSplit[0]
    month = dateSplit[1]
    day = dateSplit[2]

    timeSplit = time.split(':')
    hour = timeSplit[0]
    minute = timeSplit[1]
    second = timeSplit[2]

    if(lastMinute != minute or lastMinute == -1):
      print("new minute")
      outputResult.write("[%s-%s-%s %s:%s],%d\n" %(year,month,day,hour,minute,count))
      lastMinute = minute
      count = 0
    else:
      count += 1
  
  fileList.close()
  outputResult.close()


if __name__ == '__main__':
    main()