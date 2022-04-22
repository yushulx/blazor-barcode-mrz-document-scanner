let barcodescanner = null;
let dotnetRef = null;
var wrapper = new DBRWrapper();

window.jsFunctions = {
    setImageUsingStreaming: async function setImageUsingStreaming(imageElementId, imageStream) {
        const arrayBuffer = await imageStream.arrayBuffer();
        const blob = new Blob([arrayBuffer]);
        const url = URL.createObjectURL(blob);
        document.getElementById(imageElementId).src = url;
        document.getElementById(imageElementId).style.display = 'block';

        if (barcodescanner) {
            try {
                let results = await barcodescanner.decode(blob);
                returnResultsAsString(results);
            } catch (ex) {
                alert(ex.message);
                throw ex;
            }
        }
        
      },
    init: async function (obj) {
        console.log("init");
        let result = true;
        try {
            Dynamsoft.DBR.BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
            barcodescanner = await wrapper.createDefaultScanner((results) => {
                returnResultsAsString(results);
            });
            await barcodescanner.updateRuntimeSettings("balance");
            dotnetRef = obj;
        } catch (e) {
            console.log(e);
            result = false;
        }
        return result;
    },
    selectFile: async function () {
        if (barcodescanner) {
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
        } else {
            alert("The barcode reader is still initializing.");
        }
    },
    liveScan: async function () {
        if (barcodescanner) {
            wrapper.clearOverlay();
            await barcodescanner.show();
            wrapper.patchOverlay();
        } else {
            alert("The barcode reader is still initializing.");
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