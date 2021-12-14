let barcodescanner = null;
var dotnetRef = null;
(async () => {
    barcodescanner = await (barcodescanner = barcodescanner || Dynamsoft.DBR.BarcodeScanner.createInstance());
})();

window.jsFunctions = {
    init: function (obj) {
        console.log("init");
        dotnetRef = obj;
    },
    selectFile: async function () {
        let input = document.createElement("input");
        input.type = "file";
        input.onchange = async function () {
            try {
                let file = input.files[0];
                let results = await barcodescanner.decode(file);
                returnResultsAsString(results);
            } catch (ex) {
                alert(ex.message);
                throw ex;
            }
        };
        input.click();
    },
    liveScan: async function () {
        try {
            barcodescanner.onFrameRead = results => {
                console.log("onFrameRead");
            };
            barcodescanner.onUnduplicatedRead = async (txt, result) => {
                returnResultsAsString([result]);
                await barcodescanner.hide();
            };
            await barcodescanner.show();
        } catch (ex) {
            alert(ex.message);
            throw ex;
        }
    },
};

function returnResultsAsString(results) {
    let txts = [];
    try {
        for (let i = 0; i < results.length; ++i) {
            txts.push(results[i].barcodeText);
        }
        let barcoderesults = txts.join(', ');
        if (txts.length == 0) {
            barcoderesults = 'No barcode found';
        }

        console.log(barcoderesults);

        if (dotnetRef) {
            dotnetRef.invokeMethodAsync('ReturnBarcodeResultsAsync', barcoderesults);
        }
    } catch (e) {
    }
}