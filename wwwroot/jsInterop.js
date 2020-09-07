var barcodereader = null;
var dotnetRef = null;
(async () => {
    barcodereader = await Dynamsoft.BarcodeReader.createInstance();
    await barcodereader.updateRuntimeSettings('balance');
    let settings = await barcodereader.getRuntimeSettings();
    barcodereader.updateRuntimeSettings(settings);
})();

window.jsFunctions = {
    init: function(obj) {
        dotnetRef = obj;
    },
    selectFile: function () {
        let input = document.createElement("input");
        input.type = "file";
        input.onchange = async function () {
            let file = input.files[0];
            try {
                await barcodereader.decode(file).then((results) => {
                    let txts = [];
                    try {
                        for (let i = 0; i < results.length; ++i) {
                            txts.push(results[i].BarcodeText);
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
                });
            } catch (error) {
                alert(error);
            }
            
        };
        input.click();
    },
};
