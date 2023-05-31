const https = require('https')
const fs = require('fs')
const path = require('path');
const { parse } = require("csv-parse")
const req = require('request')

const API_KEY = ''
const url = "https://trade.hawkeoptics.com/feeds/stock-all.csv";
const file = 'stock-all.csv'
const oldFile = 'stock-all.old.csv'

const isSameItem = (a,b) => a.vpc === b.vpc && a.quantity === b.quantity 
const arrDiff = (a, b, compareFunction) => a.filter( leftValue => !b.some(rightValue => compareFunction(leftValue, rightValue)))

let items = []
let oldItems = []


function downloadFile(url) {
    const filename = path.basename(url);

    https.get(url, (res) => {
        const fileStream = fs.createWriteStream(filename);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
            fileStream.close();
            parseFile();
        });
    })
}

function parseFile() {

    fs.createReadStream(`./${file}`)
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", function (row) {
        
        items.push({
            vendor_name: "Deben",
            vpc: row[0],
            quantity: row[1]
        })

    })
    .on("end", function(){
        if(fs.existsSync(`./${oldFile}`)) {
            fs.createReadStream(`./${oldFile}`)
            .pipe(parse({ delimiter: ",", from_line: 2 }))
            .on("data", function (row) {
                
                oldItems.push({
                    active: "1",
                    vendor_name: "Deben",
                    vpc: row[0],
                    quantity: row[1]
                })

            })
            .on('end', function() {
                let result = arrDiff(items,oldItems,isSameItem)
                pushToApi(result)
            })
        } else {
            pushToApi(items)
        }
    })

}

function pushToApi(items) {
    
    fs.rename(`./${file}`, `./${oldFile}`, (err) =>{
        if(err) {
            console.log(`Error: ${err}`)
        }
    })

    if(items.length == 0) {
        console.log('Nothing to update')
        return
    }

    let bodyRequest = {records : items, with_detailed_response: 0}

    let options = {
        url: 'https://api.retailops.com/product/externalsku/update~2.json',
        headers: {
            'Content-Type' : 'application/json',
            'apikey' : API_KEY,
            'User-Agent' : 'alisdair/1.0'
        },
        body: JSON.stringify(bodyRequest)
    }

    req.post(options, async (res, err, body) => {

        if (!err && res.statusCode == 200) {
            const info = JSON.parse(body);
            console.log(JSON.stringify(info, null, "\t"));
            
        }else{
              console.log(err.body)
        } 

    })
    
}

try {

    downloadFile(url)
} catch (err) {
    console.log(err)
}
