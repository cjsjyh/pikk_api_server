import psycopg2 as pg2

def convertStringPriceToInt(price):
  result = price.replace('원','')
  result = result.split(',')
  result = "".join(result)
  return result

def InsertItems():
  #filename = input("Filename: ")
  #fileList = open(filename,"r")
  fileList = open("final_list.txt","r")

  try:
    password = input("db password: ")
    conn = pg2.connect("host=52.79.246.136 dbname=postgres user=postgres password="+password)
    conn.autocommit = True
    curs = conn.cursor()
    #curs.execute('SELECT * FROM "RECOMMEND_POST"')
    #result = curs.fetchall()
    #print(result)

    item = []
    salePrice = ""
    lastItemId = -1
    itemGroupId = -1
    while True:
      line = fileList.readline()
      if not line: break
      
      if(line[0] == '-'):
        #Remove Brand and Get Item Id
        item[2] = item[2].split('/')[1]
        #Item without Sale Price
        if(len(item) == 9):
          categoryMajor = 4
        #Item with Sale Price
        else:
          categoryMajor = 5
          salePrice = convertStringPriceToInt(item[4])
        source = "musinsa"
        originalPrice = convertStringPriceToInt(item[3])
        
        curs.execute("""SELECT id FROM "BRAND" WHERE "nameKor"='%s'""" %(item[0]))
        result = curs.fetchall()
        brandId = result[0][0]

        if(len(result) == 0):
          print("ERROR!")
          print(item)
          break

        print(item[1])

        if (lastItemId != item[categoryMajor+4] or lastItemId == -1):
          curs.execute("""INSERT INTO "ITEM_GROUP"
          ("itemMinorType_raw","itemMajorType_raw","originalPrice","sourceWebsite","FK_brandId") 
          VALUES('%s','%s','%s','%s','%s') RETURNING id""" 
          %(item[categoryMajor+1],item[categoryMajor],int(originalPrice),source,brandId))
          result = curs.fetchall()
          lastItemId = item[categoryMajor+4]
          itemGroupId = result[0][0]
          

        if (len(item) == 10):
          curs.execute("""INSERT INTO "ITEM_VARIATION" 
          ("name","imageUrl","purchaseUrl","salePrice","code","FK_itemGroupId") 
          VALUES ('%s','%s','%s','%s','%s','%s')""" 
          %(item[1],item[categoryMajor+2],item[categoryMajor+3],int(salePrice),item[2],itemGroupId))
        else:
          curs.execute("""INSERT INTO "ITEM_VARIATION" 
          ("name","imageUrl","purchaseUrl","code","FK_itemGroupId") 
          VALUES ('%s','%s','%s','%s','%s')""" 
          %(item[1],item[categoryMajor+2],item[categoryMajor+3],item[2],itemGroupId))

        item.clear()
      else:
        line = line.split('\n')[0]
        line = line.replace("'","")
        item.append(line)
  except Exception as e:
    conn.close()
    print(e)
  finally:
    fileList.close()
    if (conn):
      conn.close()

def InsertBrands():
  filename = input("Filename: ")
  fileList = open(filename, "r")

  password = input("db password: ")
  conn = pg2.connect("host=52.79.246.136 dbname=postgres user=postgres password="+password)
  conn.autocommit = True
  curs = conn.cursor()

  while True:
    line = fileList.readline()
    if not line: break

    line = line.replace("'","")
    line = line.split(',')
    curs.execute("""INSERT INTO "BRAND"("nameEng","nameKor") VALUES('%s','%s')""" %(line[0].upper(),line[1]))
    print(line[0])

  fileList.close()
  conn.close()

def main():
  InsertItems()
  #InsertBrands()


if __name__ == '__main__':
  main()