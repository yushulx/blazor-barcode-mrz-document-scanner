import { isMobile, initDocDetectModule } from "./utils.js";
import {
    mobileCaptureViewerUiConfig,
    mobilePerspectiveUiConfig,
    mobileEditViewerUiConfig,
    pcCaptureViewerUiConfig,
    pcPerspectiveUiConfig,
    pcEditViewerUiConfig
} from "./uiConfig.js";

let isInitialized = false;
let overlay = null;
let context = null;
let videoSelect = null;
let cameraInfo = {};
let cvr = null;
let cameraEnhancer = null;

function initOverlay(ol) {
    overlay = ol;
    context = overlay.getContext('2d');
}

function updateOverlay(width, height) {
    if (overlay) {
        overlay.width = width;
        overlay.height = height;
        clearOverlay();
    }
}

function clearOverlay() {
    if (context) {
        context.clearRect(0, 0, overlay.width, overlay.height);
        context.strokeStyle = '#ff0000';
        context.lineWidth = 5;
    }
}

function drawOverlay(localization, text) {
    if (context) {
        let points = localization.points;

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        context.lineTo(points[1].x, points[1].y);
        context.lineTo(points[2].x, points[2].y);
        context.lineTo(points[3].x, points[3].y);
        context.lineTo(points[0].x, points[0].y);
        context.stroke();

        context.font = '18px Verdana';
        context.fillStyle = '#ff0000';
        let x = [
            points[0].x,
            points[1].x,
            points[2].x,
            points[3].x,
        ];
        let y = [
            points[0].y,
            points[1].y,
            points[2].y,
            points[3].y,
        ];
        x.sort(function (a, b) {
            return a - b;
        });
        y.sort(function (a, b) {
            return b - a;
        });
        let left = x[0];
        let top = y[0];

        context.fillText(text, left, top + 50);
    }
}

function decodeImage(dotnetRef, url, data) {
    const img = new Image()
    img.onload = () => {
        updateOverlay(img.width, img.height);
        if (cvr) {
            cvr.capture(url, 'ReadBarcodes_Balance').then((result) => {
                showResults(result, dotnetRef);
            });

        }
    }
    img.src = url
}

function updateResolution() {
    if (cameraEnhancer) {
        let resolution = cameraEnhancer.getResolution();
        updateOverlay(resolution.width, resolution.height);
    }
}

function listCameras(deviceInfos) {
    for (var i = deviceInfos.length - 1; i >= 0; --i) {
        var deviceInfo = deviceInfos[i];
        var option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        option.text = deviceInfo.label;
        cameraInfo[deviceInfo.deviceId] = deviceInfo;
        videoSelect.appendChild(option);
    }
}

function showResults(result, dotnetRef) {
    clearOverlay();

    let txts = [];
    try {
        let localization;
        let items = result.items
        if (items.length > 0) {
            for (var i = 0; i < items.length; ++i) {

                if (items[i].type !== Dynamsoft.Core.EnumCapturedResultItemType.CRIT_BARCODE) {
                    continue;
                }

                let item = items[i];

                txts.push(item.text);
                localization = item.location;

                drawOverlay(
                    localization,
                    item.text
                );
            }


        }
    } catch (e) {
        alert(e);
    }

    let barcoderesults = txts.join(', ');
    if (txts.length == 0) {
        barcoderesults = 'No barcode found';
    }

    if (dotnetRef) {
        dotnetRef.invokeMethodAsync('ReturnBarcodeResultsAsync', barcoderesults);
    }
}

async function openCamera() {
    clearOverlay();

    try {
        let deviceId = videoSelect.value;
        if (cameraEnhancer && deviceId !== "") {
            await cameraEnhancer.selectCamera(deviceId);
            await cameraEnhancer.open();
            cvr.startCapturing('ReadSingleBarcode');
        }
    }
    catch(e) {
        alert(e);
    }
}

async function dispose() {
    if (cvr) {
        cvr.dispose();
        cvr = null;
    }

    if (cameraEnhancer) {
        cameraEnhancer.dispose();
        cameraEnhancer = null;
    }
}

window.jsFunctions = {

    setLicense: async function setLicense(license) {
        if (isInitialized) return true;

        try {
            Dynamsoft.Core.CoreModule.engineResourcePaths = {
                std: "https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-std@1.2.10/dist/",
                dip: "https://cdn.jsdelivr.net/npm/dynamsoft-image-processing@2.2.30/dist/",
                core: "https://cdn.jsdelivr.net/npm/dynamsoft-core@3.2.30/dist/",
                license: "https://cdn.jsdelivr.net/npm/dynamsoft-license@3.2.21/dist/",
                cvr: "https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.2.30/dist/",
                dce: "https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.3/dist/",
                dbr: "https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.2.10/dist/",
                dlr: "https://cdn.jsdelivr.net/npm/dynamsoft-label-recognizer@3.2.30/dist/",
                dcp: "https://cdn.jsdelivr.net/npm/dynamsoft-code-parser@2.2.10/dist/",
                ddn: "https://cdn.jsdelivr.net/npm/dynamsoft-document-normalizer@2.2.10/dist/",
                dnn: "https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-dnn@1.0.20/dist/"
            };
            Dynamsoft.DDV.Core.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@latest/dist/engine";
            
            Dynamsoft.License.LicenseManager.initLicense(license, true);

            await Dynamsoft.Core.CoreModule.loadWasm(["DIP"]);
            await Dynamsoft.Core.CoreModule.loadWasm(["DBR", "DDN", "DLR"]);

            cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
            Dynamsoft.DDV.setProcessingHandler("imageFilter", new Dynamsoft.DDV.ImageFilter());
            await Dynamsoft.DDV.Core.init();

            isInitialized = true;
        } catch (e) {
            alert(e);
            return false;
        }

        return true;
    },
    initReader: async function () {
        if (!isInitialized) {
            alert("Please set the license first.");
            return;
        }
        try {
            dispose();
            cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();

        } catch (e) {
            alert(e);
        }
    },
    initScanner: async function (dotnetRef, videoId, selectId, overlayId) {
        if (!isInitialized) {
            alert("Please set the license first.");
            return;
        }
        let canvas = document.getElementById(overlayId);
        initOverlay(canvas);
        videoSelect = document.getElementById(selectId);
        videoSelect.onchange = openCamera;

        try {
            dispose();

            let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
            cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);

            let uiElement = document.getElementById(videoId);
            uiElement.append(cameraView.getUIElement());

            cameraView.getUIElement().shadowRoot?.querySelector('.dce-sel-camera')?.setAttribute('style', 'display: none');
            cameraView.getUIElement().shadowRoot?.querySelector('.dce-sel-resolution')?.setAttribute('style', 'display: none');

            

            cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
            cvr.setInput(cameraEnhancer);

            cvr.addResultReceiver({
                onCapturedResultReceived: (result) => {
                    showResults(result, dotnetRef);
                },
            });

            cvr.addResultReceiver({
                onDecodedBarcodesReceived: (result) => {
                    if (!result.barcodeResultItems.length) return;

                },
            });

            cameraEnhancer.on('played', () => {
                updateResolution();
            });

         
        } catch (e) {
            alert(e);
            result = false;
        }
        return true;
    },
    selectFile: async function (dotnetRef, overlayId, imageId) {
        if (cameraEnhancer) {
            cameraEnhancer.dispose();
            cameraEnhancer = null;
        }
        initOverlay(document.getElementById(overlayId));
        if (cvr) {
            let input = document.createElement("input");
            input.type = "file";
            input.onchange = async function () {
                try {
                    let file = input.files[0];
                    var fr = new FileReader();
                    fr.onload = function () {
                        let image = document.getElementById(imageId);
                        image.src = fr.result;
                        image.style.display = 'block';

                        decodeImage(dotnetRef, fr.result, file);
                    }
                    fr.readAsDataURL(file);

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
    getCameras: async function () {
        if (cameraEnhancer) {
            let cameras = await cameraEnhancer.getAllCameras();
            listCameras(cameras);
        }
    },
    startCamera: async function() {
        openCamera();
    },
    stopCamera: async function () {
        try {
            if (cameraEnhancer) {
                cameraEnhancer.pause();
            }
        }
        catch (e) {
            alert(e);
        }
    },
    initDocumentViewer: async function (containerId) {
        if (!isInitialized) {
            alert("Please set the license first.");
            return;
        }
        try {
            let config = Dynamsoft.DDV.getDefaultUiConfig("editViewer", { includeAnnotationSet: true });
            let editViewer = new Dynamsoft.DDV.EditViewer({
                container: containerId,
                uiConfig: config,
            });
        }
        catch (e) {
            alert(e);
        }
    },
    initDocumentScanner: async function (containerId) {
        if (!isInitialized) {
            alert("Please set the license first.");
            return;
        }

        try {
            await initDocDetectModule(Dynamsoft.DDV, Dynamsoft.CVR);

            const captureViewer = new Dynamsoft.DDV.CaptureViewer({
                container: containerId,
                uiConfig: isMobile() ? mobileCaptureViewerUiConfig : pcCaptureViewerUiConfig,
                viewerConfig: {
                    acceptedPolygonConfidence: 60,
                    enableAutoDetect: true,
                }
            });

            await captureViewer.play({ resolution: [1920, 1080] });

            captureViewer.on("showPerspectiveViewer", () => switchViewer(0, 1, 0));
            
            const perspectiveViewer = new Dynamsoft.DDV.PerspectiveViewer({
                container: containerId,
                groupUid: captureViewer.groupUid,
                uiConfig: isMobile() ? mobilePerspectiveUiConfig : pcPerspectiveUiConfig,
                viewerConfig: { scrollToLatest: true }
            });

            perspectiveViewer.hide();
            perspectiveViewer.on("backToCaptureViewer", () => {
                switchViewer(1, 0, 0);
                captureViewer.play();
            });

            perspectiveViewer.on("showEditViewer", () => switchViewer(0, 0, 1));

            const editViewer = new Dynamsoft.DDV.EditViewer({
                container: containerId,
                groupUid: captureViewer.groupUid,
                uiConfig: isMobile() ? mobileEditViewerUiConfig : pcEditViewerUiConfig
            });

            editViewer.hide();
            editViewer.on("backToPerspectiveViewer", () => switchViewer(0, 1, 0));

            const switchViewer = (c, p, e) => {
                captureViewer.hide();
                perspectiveViewer.hide();
                editViewer.hide();
                if (c) captureViewer.show();
                else captureViewer.stop();
                if (p) perspectiveViewer.show();
                if (e) editViewer.show();
            };
            
        }
        catch (e) {
            console.log({
                container: containerId,
                uiConfig: isMobile() ? mobilePerspectiveUiConfig : pcPerspectiveUiConfig,
                viewerConfig: { scrollToLatest: true }
            });
            alert(e);
        }
    }
};

