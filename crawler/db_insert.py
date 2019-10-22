import psycopg2 as pg2

def convertStringPriceToInt(price):
  result = price.replace('원','')
  result = result.split(',')
  result = "".join(result)
  return result

def FollowPost():
  password = input("db password: ")
  conn = pg2.connect("host=52.79.246.136 dbname=postgres user=postgres password="+password)
  conn.autocommit = True
  curs = conn.cursor()

  for i in range(1,8):
    curs.execute("""INSERT INTO "RECOMMEND_POST_FOLLOWER"("FK_accountId", "FK_postId") VALUES (%d,198)""" %(i))

def InsertUsers():
  password = input("db password: ")
  conn = pg2.connect("host=52.79.246.136 dbname=postgres user=postgres password="+password)
  conn.autocommit = True
  curs = conn.cursor()

  for i in range(5,40):
    curs.execute("""INSERT INTO "USER_CONFIDENTIAL"(id,"providerType","providerId") VALUES (%s,'FACEBOOK','fb%s')""" %(str(i),str(i)))

def InsertUserInfo():
  password = input("db password: ")
  conn = pg2.connect("host=52.79.246.136 dbname=postgres user=postgres password="+password)
  conn.autocommit = True
  curs = conn.cursor()

  for i in range(1,40):
    curs.execute("""INSERT INTO "USER_INFO"("FK_accountId","name","email","age","height","weight") VALUES (%d,'name','email',1,1,1)""" %(i))


def InsertFinalCategory():
  try:
    categoryList = open("major_category.txt","r")

    password = input("db password: ")
    conn = pg2.connect("host=52.79.246.136 dbname=postgres user=postgres password="+password)
    conn.autocommit = True
    curs = conn.cursor()
    
    while True:
      line = categoryList.readline()
      if not line: break

      curs.execute("""ALTER TYPE "TAG_ITEM_MAJORTYPE" ADD VALUE '%s'""" %(line.split('\n')[0]))

  except Exception as e:
    conn.close()
    print(e)
  finally:
    categoryList.close()
    if (conn):
      conn.close()

def InsertItems():
  filename = input("Filename: ")
  fileList = open(filename,"r")
  #fileList = open("final_list.txt","r")

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
  FollowPost()
  #InsertUserInfo()
  #InsertUsers()
  #InsertFinalCategory()
  #InsertItems()
  #InsertBrands()


if __name__ == '__main__':
  main()
