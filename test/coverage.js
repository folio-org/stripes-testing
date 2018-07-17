module.exports.doCoverage =  function coverage( nightmare) {

    nightmare
    .evaluate(() => window.__coverage__)
    .end()
    .then((cov) => {
        // this executes in Node scope
        // handle the data passed back to us from browser scope
        const strCoverage = JSON.stringify(cov);
        if(strCoverage != null){
            const hash = require('crypto').createHmac('sha256', '')
            .update(strCoverage)
            .digest('hex');
      
          const fileName = "./.nyc_output/coverage-"+hash+".json";
          require('fs').writeFileSync(fileName, strCoverage);

        }

    })
    .catch(err => console.log(err));
    }