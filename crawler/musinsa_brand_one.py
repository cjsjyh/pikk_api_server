"""Crawlling"""
from bs4 import BeautifulSoup
import urllib.request

"""Clean Text"""
import re


def main():
    musinsa_brands()
    #musinsa_products()



def musinsa_brands():
    html = urllib.request.urlopen('https://store.musinsa.com/app/contents/brandshop')
    bsObj = BeautifulSoup(html,'html.parser')

    input_id = input()

    brandList = bsObj.find('div',{'class','brand_name_container'}).find('a',{'name':input_id}).nextSibling
    brands = brandList.nextSibling.find_all('li',{'class':'brand_li'})
    for brand in brands:
        nameEng = brand.find("dt").find('a').getText()
        nameKor = brand.find("dd").find('a').getText()
        brandUrl = brand.find("dt").find('a').get('href')

        pageHtml = urllib.request.urlopen('https://store.musinsa.com'+brandUrl)
        pageBsObj = BeautifulSoup(pageHtml, 'html.parser')
        likeCount = pageBsObj.find('span',{'class':'text_interest_off'}).getText().split()[0]
        print('%s,%s,%s,%s' %(nameEng,nameKor,brandUrl,likeCount))
        
        


def musinsa_products():
    urlFront = 'https://store.musinsa.com/app/brand/goods_list/5252byoioi?brand_code=5252byoioi&d_cat_cd=&u_cat_cd=&page_kind=brandshop&list_kind=small&sort=new&page='
    urlBack = '&news_page=1&display_cnt=80&free_dlv=&ex_soldout=&sale_goods=&price=&color=&sex=&tag=&exclusive_yn=&review_total_more=28497&review_total=28499&popup=&blf_yn=&like_brand_code=5252byoioi&price1=&price2=&chk_exclusive=&chk_sale=&chk_soldout='
    
    html = urllib.request.urlopen(urlFront + str(1) + urlBack)
    bsObj = BeautifulSoup(html,'html.parser')

    totalPage = bsObj.find('span',{'class':'totalPagingNum'}).getText()
    totalPage = int(totalPage.strip())
    products = bsObj.find('ul',{'id':'searchList'}).find_all('li',{'class':'li_box'})
    print("total page:"+ str(totalPage))
    print("item count:" + str(len(products)))
    for product in products:
        purchaseUrl = product.find("div",{"class":"list_img"}).find("a").get('href')
        imageUrl = product.find("div",{"class":"list_img"}).find("a").find("img").get('src')
        brand = product.find("p",{"class":"item_title"}).find("a").getText()
        name = product.find("p",{"class":"list_info"}).find("a").get('title')
        prices = product.find("p",{"class":"price"}).getText()
        prices = prices.strip().split()
        print("brand,"+brand)
        print("item,"+name)
        print("original price,"+ prices[0])
        if (len(prices)>1):
                print("sale price,"+ prices[1])
        print("imageUrl,"+imageUrl)
        print("purchaseUrl,"+purchaseUrl)
        print('-------------')



if __name__ == '__main__':
    main()