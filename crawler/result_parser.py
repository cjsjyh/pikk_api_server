import numpy as np
import copy
def similarity(s, t, ratio_calc = False):
    """ levenshtein_ratio_and_distance:
        Calculates levenshtein distance between two strings.
        If ratio_calc = True, the function computes the
        levenshtein distance ratio of similarity between two strings
        For all i and j, distance[i,j] will contain the Levenshtein
        distance between the first i characters of s and the
        first j characters of t
    """
    # Initialize matrix of zeros
    rows = len(s)+1
    cols = len(t)+1
    distance = np.zeros((rows,cols),dtype = int)

    # Populate matrix of zeros with the indeces of each character of both strings
    for i in range(1, rows):
        for k in range(1,cols):
            distance[i][0] = i
            distance[0][k] = k

    # Iterate over the matrix to compute the cost of deletions,insertions and/or substitutions    
    for col in range(1, cols):
        for row in range(1, rows):
            if s[row-1] == t[col-1]:
                cost = 0 # If the characters are the same in the two strings in a given position [i,j] then the cost is 0
            else:
                # In order to align the results with those of the Python Levenshtein package, if we choose to calculate the ratio
                # the cost of a substitution is 2. If we calculate just distance, then the cost of a substitution is 1.
                if ratio_calc == True:
                    cost = 2
                else:
                    cost = 1
            distance[row][col] = min(distance[row-1][col] + 1,      # Cost of deletions
                                 distance[row][col-1] + 1,          # Cost of insertions
                                 distance[row-1][col-1] + cost)     # Cost of substitutions
    if ratio_calc == True:
        # Computation of the Levenshtein Distance Ratio
        Ratio = ((len(s)+len(t)) - distance[row][col]) / (len(s)+len(t))
        return Ratio
    else:
        # print(distance) # Uncomment if you want to see the matrix showing how the algorithm computes the cost of deletions,
        # insertions and/or substitutions
        # This is the minimum number of edits needed to convert string a to string b
        return "The strings are {} edits away".format(distance[row][col])

def final_parse():
  colorFile = open("color_list.txt","r")
  colorList = []
  while True:
    line = colorFile.readline()
    if not line: break
    colorList.append(line.split('\n')[0].lower())

  filename = input("Filename: ")
  fileList = open(filename,"r")
  outputFile = open("output_list.txt","w")
  itemCount = 0

  itemId = 0

  lineFromDash = 0

  item1 = []
  item2 = []

  while True:
    line = fileList.readline()
    if not line: break

    if(line[0] == '-'):
      lineFromDash = 0
      itemCount += 1
      print(itemCount)

      if (len(item1) != 0):
        #가격이 같으면
        item1removed = item1[1]
        item2removed = item2[1]
        for color in colorList:
          item1removed = item1removed.replace(color,'')
          item2removed = item2removed.replace(color,'')

        #가격이 같을때
        if(item1[3] == item2[3]):
          #이름이 80%이상 일치하면
          if(similarity(item1removed,item2removed,ratio_calc=True) > 0.8):
            print('Similiar!: %d' %itemId)
          #이름이 일치하지 않으면
          else:
            itemId += 1
        #가격이 다르면 무조건 다름
        else:
          itemId += 1
      
      item2.append(str(itemId))
      item1.clear()
      item1 = copy.deepcopy(item2)
      item2.clear()

      # Remove trailing () [] - :
      
      for (index,itemline) in enumerate(item1):
        '''
        if(index == 1):
          i=0
          flag = False
          for i in reversed(range(len(itemline)-1)):
            if(flag):
              flag = False
              continue

            if(itemline[i] == ')'):
              if(i-1 >= 0 and itemline[i-1] != '('):
                break
              else:
                flag = True
            elif(itemline[i] == ']'):
              if(i-1 >= 0 and itemline[i-1] != '['):
                break
              else:
                flag = True
            elif(itemline[i] != ' ' and itemline[i] != '-' and itemline[i] != ':'):
              break
          itemline = itemline[:i+1] + '\n'
        '''
        outputFile.write(itemline)
      outputFile.write('\n---------\n')

    # ------가 아니면
    else:
      item2.append(line)
  fileList.close()
  print("[ Result ] Total Item Count: %d Distinct Item Count: %d" %(itemCount,itemId))

def main():
  final_parse()

    


if __name__ == '__main__':
  main()