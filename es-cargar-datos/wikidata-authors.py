# encoding=utf8  
# wikidata_authors.py

import sys  

reload(sys)  
sys.setdefaultencoding('utf8')

#FILE_URL = "http://apps.sloanahrens.com/qbox-blog-resources/kaggle-titanic-data/test.csv"
FILE_URL = "file:///home/gustavo/jsonld/query-authors-wikidata.csv"

ES_HOST = {
    "host" : "localhost", 
    "port" : 9200
}

INDEX_NAME = 'data'
TYPE_NAME = 'autor'

ID_FIELD = 'bvmc_id'

import csv
import urllib2
import json

from elasticsearch import Elasticsearch

response = urllib2.urlopen(FILE_URL)
csv_file_object = csv.reader(response)
 
header = csv_file_object.next()
header = [item.lower() for item in header]

bulk_data = [] 

for row in csv_file_object:
    data_dict = {}
    for i in range(len(row)):
        if header[i] == "generos" :
            data_dict[header[i]] = json.dumps(row[i].split("#"))
        else:
            data_dict[header[i]] = row[i]

    op_dict = {
        "index": {
        	"_index": INDEX_NAME, 
        	"_type": TYPE_NAME, 
        	"_id": data_dict[ID_FIELD]
        }
    }
    bulk_data.append(op_dict)
    bulk_data.append(data_dict)

# create ES client, create index
es = Elasticsearch(hosts = [ES_HOST])

if es.indices.exists(INDEX_NAME):
    print("deleting '%s' index..." % (INDEX_NAME))
    res = es.indices.delete(index = INDEX_NAME)
    print(" response: '%s'" % (res))

request_body = {
    "settings" : {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
          "analyzer": {
            "folding": {
            "tokenizer": "standard",
              "filter": [
                "lowercase",
                "asciifolding"
              ]
            }
          }
        }
    },
    "mappings": {
	        "autor": {
	            "properties": {
	                "nombre": {"index": "analyzed", "analyzer": "spanish", "type": "text", 
                                   "fields": {
                                     "folded": {
                                       "type": "string",
                                       "analyzer": "folding"
                                     }
                                  }
                        },
	                "bvmc_id": {"index": "not_analyzed", "type": "keyword"},
	                "wikidata_uri": {"index": "not_analyzed", "type": "text"},
	                "sexo": {"index": "not_analyzed", "type": "keyword"},
                        "pais": {"index": "not_analyzed", "type": "keyword"},
	                "imagen": {"index": "not_analyzed", "type": "text"},
	                "ano_nacimiento": {"index": "not_analyzed", "type": "keyword"},
	                "ano_fallecimiento": {"index": "not_analyzed", "type": "keyword"},
                        "generos": {"index": "not_analyzed", "type": "keyword"},
	            }
                 }
   }
}

print("creating '%s' index..." % (INDEX_NAME))
res = es.indices.create(index = INDEX_NAME, body = request_body)
print(" response: '%s'" % (res))


# bulk index the data
print("bulk indexing...")
res = es.bulk(index = INDEX_NAME, body = bulk_data, refresh = True)
#print(" response: '%s'" % (res))


# sanity check
print("searching...")
#res = es.search(index = INDEX_NAME, size=2, body={"query": {"match": {"nombre.folded": "Nikolái"}}})
res = es.search(index = INDEX_NAME, size=2, body={"query": {"match": {"nombre.folded": "Nikolai"}}})
print(" response: '%s'" % (res))

print("results:")
for hit in res['hits']['hits']:
    print(hit["_source"])

