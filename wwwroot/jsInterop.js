import { isMobile, initDocDetectModule } from "./utils.js";
import {
    mobileCaptureViewerUiConfig,
    mobilePerspectiveUiConfig,
    mobileEditViewerUiConfig,
    pcCaptureViewerUiConfig,
    pcPerspectiveUiConfig,
    pcEditViewerUiConfig
} from "./uiConfig.js";

// ---------------------------------------------------------------------------
// SDK versions for engine resources loaded from the jsDelivr CDN.
// Keep in sync with the <script>/<link> tags in index.html / index.demo.html.
// ---------------------------------------------------------------------------
const DCV_BUNDLE_VERSION = "3.6.3200";
const DCV_DATA_VERSION = "1.2.2";
const DDV_VERSION = "5.0.1";
const DWT_VERSION = "19.4.4";
const CDN = "https://cdn.jsdelivr.net/npm/";

// ---------------------------------------------------------------------------
// License handling
//
// The standalone build (index.html) activates through the in-app license flow:
// the visitor pastes a key on the Home page. The hosted Codepool demo
// (index.demo.html) sets window.DEMO_BUILD, which switches to automatic
// activation with a hostname-resolved key — the Codepool license is bound to
// dynamsoft.com; anywhere else (localhost, a fork, a staging host) the SDK's
// public 24-hour trial key keeps the page usable. This mirrors the license
// logic in the sibling Codepool demos (demos/barcode-mrz-document-scanner).
// ---------------------------------------------------------------------------
const BOUND_HOSTS = ['dynamsoft.com'];

// Codepool license — bound to dynamsoft.com, shared by the /codepool/demos/ pages.
const CODEPOOL_LICENSE_KEY = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAwLTEwMTY0ODQ5MCIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21sdHMuZHluYW1zb2Z0LmNvbS8iLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMCIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NsdHMuZHluYW1zb2Z0LmNvbS8iLCJjaGVja0NvZGUiOjE0MDA4MDY1Mjl9';

// SDK public trial key — no domain binding, good for 24 hours.
const TRIAL_LICENSE_KEY = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';

/* Analytics shim: the hosted page loads demos/shared/analytics.js, but the
   shared helper must never be a hard dependency — if it is missing everything
   still works, it just reports nothing. */
const analytics = window.DemoAnalytics || {
    action: function () { /* noop */ },
};

function isBoundHost() {
    const host = window.location.hostname.toLowerCase();
    return BOUND_HOSTS.some((bound) => host === bound || host.endsWith('.' + bound));
}

let resolvedLicenseKey = null;

function resolveLicenseKey() {
    if (resolvedLicenseKey) {
        return resolvedLicenseKey;
    }
    if (isBoundHost()) {
        resolvedLicenseKey = CODEPOOL_LICENSE_KEY;
        return resolvedLicenseKey;
    }
    console.info('[demo] Using the SDK trial license: the Codepool license is bound to '
        + BOUND_HOSTS.join(', ') + ' and cannot activate on "' + window.location.hostname + '".');
    analytics.action('license_fallback', { host: window.location.hostname });
    resolvedLicenseKey = TRIAL_LICENSE_KEY;
    return resolvedLicenseKey;
}

let isInitialized = false;
// Tracks an in-flight (or finished) activation so the example pages can wait
// for the hosted demo's automatic activation instead of failing on a cold page.
let activationInFlight = null;
// The license key that the SDK (and the Web TWAIN REST example) is using.
let activeLicense = '';

let overlay = null;
let context = null;
let videoSelect = null;
let cameraInfo = {};
let cvr = null;
let cameraEnhancer = null;
let parser = null
let templateName = '';
let dwtObject = null;
let sourceList = null;
let selectSources = null;

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

function decodeImage(dotnetRef, url, visionType) {
    const img = new Image()
    img.onload = () => {
        updateOverlay(img.width, img.height);
        if (cvr) {
            if (visionType === 'barcode') {
                cvr.capture(url, templateName).then((result) => {
                    showBarcodeResults(result, dotnetRef);
                });
            }
            else if (visionType === 'mrz') {
                cvr.capture(url, templateName).then((result) => {
                    showMrzResults(result, dotnetRef);
                });
            }

        }
    }
    img.src = url
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

async function showMrzResults(result, dotnetRef) {
    clearOverlay();

    let txts = [];
    try {
        let localization;
        let items = result.items;
        if (items.length > 0) {
            for (var i = 0; i < items.length; ++i) {

                if (items[i].type !== Dynamsoft.Core.EnumCapturedResultItemType.CRIT_TEXT_LINE) {
                    continue;
                }

                let item = items[i];

                txts.push(item.text);
                localization = item.location;

                drawOverlay(
                    localization,
                    ''
                );

                let parseResults = await parser.parse(item.text);
                if (dotnetRef) {
                    dotnetRef.invokeMethodAsync('ReturnMrzResultsAsync', JSON.stringify(handleMrzParseResult(parseResults)));
                }
                break;
            }
        }
    } catch (e) {
        alert(e);
    }
}

function showBarcodeResults(result, dotnetRef) {
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
            cvr.startCapturing(templateName);
        }
    }
    catch (e) {
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

function handleMrzParseResult(result) {
    const parseResultInfo = {};
    let type = result.getFieldValue("documentCode");
    parseResultInfo['Document Type'] = JSON.parse(result.jsonString).CodeType;
    let nation = result.getFieldValue("issuingState");
    parseResultInfo['Issuing State'] = nation;
    let surName = result.getFieldValue("primaryIdentifier");
    parseResultInfo['Surname'] = surName;
    let givenName = result.getFieldValue("secondaryIdentifier");
    parseResultInfo['Given Name'] = givenName;
    let passportNumber = type === "P" ? result.getFieldValue("passportNumber") : result.getFieldValue("documentNumber");
    parseResultInfo['Passport Number'] = passportNumber;
    let nationality = result.getFieldValue("nationality");
    parseResultInfo['Nationality'] = nationality;
    let gender = result.getFieldValue("sex");
    parseResultInfo["Gender"] = gender;
    let birthYear = result.getFieldValue("birthYear");
    let birthMonth = result.getFieldValue("birthMonth");
    let birthDay = result.getFieldValue("birthDay");
    if (parseInt(birthYear) > (new Date().getFullYear() % 100)) {
        birthYear = "19" + birthYear;
    } else {
        birthYear = "20" + birthYear;
    }
    parseResultInfo['Date of Birth (YYYY-MM-DD)'] = birthYear + "-" + birthMonth + "-" + birthDay;
    let expiryYear = result.getFieldValue("expiryYear");
    let expiryMonth = result.getFieldValue("expiryMonth");
    let expiryDay = result.getFieldValue("expiryDay");
    if (parseInt(expiryYear) >= 60) {
        expiryYear = "19" + expiryYear;
    } else {
        expiryYear = "20" + expiryYear;
    }
    parseResultInfo["Date of Expiry (YYYY-MM-DD)"] = expiryYear + "-" + expiryMonth + "-" + expiryDay;
    return parseResultInfo;
}

async function initMRZ() {
    await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD1_ID");
    await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_FRENCH_ID");
    await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_ID");
    await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_VISA");
    await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_PASSPORT");
    await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_VISA");
    await Dynamsoft.CVR.CaptureVisionRouter.appendDLModelBuffer("MRZCharRecognition");
    await Dynamsoft.CVR.CaptureVisionRouter.appendDLModelBuffer("MRZTextLineRecognition");

    cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
    parser = await Dynamsoft.DCP.CodeParser.createInstance();
    let ret = await cvr.initSettings('template/mrz.json');
    console.log(ret);
}

/* Actual activation routine. Assumes it is only entered once at a time —
   callers go through startActivation(). */
async function activateSDK(license) {
    let ok = false;
    try {
        // Point every engine at the jsDelivr CDN copy of the SDK that matches
        // the versions in index.html. This keeps the app bundle free of the
        // ~200 MB of wasm/model resources.
        Dynamsoft.Core.CoreModule.engineResourcePaths = {
            dcvBundle: CDN + "dynamsoft-capture-vision-bundle@" + DCV_BUNDLE_VERSION + "/dist/",
            dcvData: CDN + "dynamsoft-capture-vision-data@" + DCV_DATA_VERSION + "/"
        };

        // Visit https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform to get a trial license for capture vision suite.
        await Dynamsoft.License.LicenseManager.initLicense(license, true);

        // Capture Vision Router 3.6 expects the recognition modules to be
        // loaded explicitly; relying on lazy loading can leave capture()
        // unresolved on the first call.
        await Dynamsoft.Core.CoreModule.loadWasm();

        cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();

        // Dynamsoft Document Viewer 5.0 splits its features into plugins that
        // must be loaded (ddv-plugin-*.js in index.html) and installed before
        // Core.init(). Without the camera plugin, creating a CaptureViewer
        // fails with "The 'camera' plugin is not installed."
        Dynamsoft.DDV.use(Dynamsoft.DDV.CameraPlugin);
        Dynamsoft.DDV.use(Dynamsoft.DDV.AnnotationPlugin);
        Dynamsoft.DDV.use(Dynamsoft.DDV.ImagePdfParserPlugin);

        Dynamsoft.DDV.Core.license = license;
        Dynamsoft.DDV.Core.engineResourcePath = CDN + "dynamsoft-document-viewer@" + DDV_VERSION + "/dist/engine";
        await Dynamsoft.DDV.Core.init();
        Dynamsoft.DDV.setProcessingHandler("imageFilter", new Dynamsoft.DDV.ImageFilter());

        Dynamsoft.DWT.ResourcesPath = CDN + "dwt@" + DWT_VERSION + "/dist";
        Dynamsoft.DWT.ServiceInstallerLocation = "https://download2.dynamsoft.com/Demo/DWT/Resources/dist/";

        activeLicense = license;
        isInitialized = true;
        ok = true;
        console.log('[sdk] Dynamsoft SDK activated.');
    } catch (e) {
        alert(e);
    }
    return ok;
}

function startActivation(license) {
    if (isInitialized) {
        return Promise.resolve(true);
    }
    if (!activationInFlight) {
        activationInFlight = activateSDK(license).then((ok) => {
            if (!ok) {
                // Allow a retry (e.g. the visitor pastes a better key).
                activationInFlight = null;
            }
            return ok;
        });
    }
    return activationInFlight;
}

/* Example pages call this before touching the SDK: on the hosted demo the
   activation may still be running when the page opens (deep link or fast
   navigation), so wait for it instead of failing with "activate first". */
async function ensureActivated() {
    if (isInitialized) {
        return true;
    }
    if (activationInFlight) {
        await activationInFlight;
    }
    return isInitialized;
}

window.jsFunctions = {

    setLicense: async function setLicense(license) {
        if (isInitialized) return true;
        return await startActivation(license);
    },
    isHostedDemo: function isHostedDemo() {
        return !!window.DEMO_BUILD;
    },
    isSDKReady: function isSDKReady() {
        return isInitialized;
    },
    /* Resolves when the (automatic) activation settles; used by the Home page
       to flip its status chip from "Initializing…" to "ready". */
    waitForActivation: async function waitForActivation() {
        return await ensureActivated();
    },
    licenseNote: function licenseNote() {
        if (!window.DEMO_BUILD) {
            return 'your own license';
        }
        return isBoundHost()
            ? 'Codepool license bound to dynamsoft.com'
            : 'public 24-hour trial license';
    },
    initBarcodeReader: async function () {
        if (!(await ensureActivated())) {
            alert("Please set the license first.");
            return;
        }
        try {
            templateName = 'ReadBarcodes_Balance';
            dispose();
            cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();

        } catch (e) {
            alert(e);
        }
    },
    initBarcodeScanner: async function (dotnetRef, videoId, selectId) {
        if (!(await ensureActivated())) {
            alert("Please set the license first.");
            return;
        }
        // Camera mode draws nothing on the external canvas: DCE keeps a
        // dedicated drawing layer per product (1 = document, 2 = text line /
        // MRZ, 3 = barcode) and maps the detection coordinates to the
        // viewfinder internally. Drawing the boxes ourselves produced
        // misaligned overlays whenever the viewfinder aspect ratio differed
        // from the camera stream, so camera mode relies on those built-in
        // layers; the manual canvas is only used for uploaded images.
        overlay = null;
        context = null;
        videoSelect = document.getElementById(selectId);
        videoSelect.onchange = openCamera;

        try {
            // ReadBarcodes_Default decodes every barcode in view;
            // ReadSingleBarcode only ever returned the first one.
            templateName = 'ReadBarcodes_Default';

            dispose();

            let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
            // DCE defaults to objectFit "contain", which renders a portrait
            // phone stream as a narrow pillar inside a wide viewfinder.
            // "cover" fills the stage; the viewfinder's own aspect ratio does
            // the cropping.
            cameraView.setVideoFit('cover');
            cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);

            let uiElement = document.getElementById(videoId);
            uiElement.append(cameraView.getUIElement());

            cameraView.getUIElement().shadowRoot?.querySelector('.dce-sel-camera')?.setAttribute('style', 'display: none');
            cameraView.getUIElement().shadowRoot?.querySelector('.dce-sel-resolution')?.setAttribute('style', 'display: none');



            cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
            cvr.setInput(cameraEnhancer);

            cvr.addResultReceiver({
                onCapturedResultReceived: (result) => {
                    showBarcodeResults(result, dotnetRef);
                },
            });

            cvr.addResultReceiver({
                onDecodedBarcodesReceived: (result) => {
                    if (!result.barcodeResultItems.length) return;

                },
            });


        } catch (e) {
            alert(e);
            result = false;
        }
        return true;
    },
    selectFile: async function (dotnetRef, overlayId, imageId, visionType) {
        if (!(await ensureActivated())) {
            alert("Please set the license first.");
            return;
        }
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

                        decodeImage(dotnetRef, fr.result, visionType);
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
    startCamera: async function () {
        openCamera();
    },
    stopCamera: async function () {
        try {
            if (cameraEnhancer) {
                cameraEnhancer.pause();
            }

            if (cvr) {
                cvr.stopCapturing();
            }
        }
        catch (e) {
            alert(e);
        }
    },
    initDocumentViewer: async function (containerId) {
        if (!(await ensureActivated())) {
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
        if (!(await ensureActivated())) {
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
    },
    initMrzReader: async function () {
        if (!(await ensureActivated())) {
            alert("Please set the license first.");
            return;
        }
        try {
            templateName = 'ReadMRZ';
            dispose();
            await initMRZ();
        } catch (e) {
            console.log(e);
        }
    },
    initMrzScanner: async function (dotnetRef, videoId, selectId) {
        if (!(await ensureActivated())) {
            alert("Please set the license first.");
            return;
        }
        // Camera mode: the MRZ boxes are rendered by DCE's text-line drawing
        // layer (layer 2); see the note in initBarcodeScanner.
        overlay = null;
        context = null;
        videoSelect = document.getElementById(selectId);
        videoSelect.onchange = openCamera;

        try {
            templateName = 'ReadMRZ';

            dispose();

            await initMRZ();

            let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
            // Fill the viewfinder with the camera stream instead of
            // letterboxing it (same rationale as the barcode scanner above).
            cameraView.setVideoFit('cover');
            cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);

            let uiElement = document.getElementById(videoId);
            uiElement.append(cameraView.getUIElement());

            cameraView.getUIElement().shadowRoot?.querySelector('.dce-sel-camera')?.setAttribute('style', 'display: none');
            cameraView.getUIElement().shadowRoot?.querySelector('.dce-sel-resolution')?.setAttribute('style', 'display: none');

            // Restrict capture to the band where the MRZ sits: it improves
            // recognition and shows a scan-region hint on phones.
            cameraEnhancer.setScanRegion({
                x: 10,
                y: 30,
                width: 80,
                height: 40,
                isMeasuredInPercentage: true
            });

            cvr.setInput(cameraEnhancer);
            cvr.addResultReceiver({
                onCapturedResultReceived: (result) => {
                    showMrzResults(result, dotnetRef);
                },
            });


        } catch (e) {
            alert(e);
            result = false;
        }
        return true;
    },
    initWebTwain: async function (containerId, width, height) {
        if (!(await ensureActivated())) {
            alert("Please set the license first.");
            return;
        }

        try {
            // Cap the fixed 800x800 viewer to the available width so it cannot
            // overflow the layout on phones; keep it square.
            const containerEl = document.getElementById(containerId);
            if (containerEl && containerEl.clientWidth > 0 && width > containerEl.clientWidth) {
                height = Math.round(height * (containerEl.clientWidth / width));
                width = containerEl.clientWidth;
            }

            await new Promise((resolve, reject) => {
                Dynamsoft.DWT.CreateDWTObjectEx({ "WebTwainId": containerId }, (obj) => {
                    dwtObject = obj;
                    dwtObject.Viewer.bind(document.getElementById(containerId));
                    dwtObject.Viewer.width = width;
                    dwtObject.Viewer.height = height;
                    dwtObject.Viewer.show();
                    resolve();
                }, (errorString) => {
                    console.log(errorString);
                    resolve();
                });
            });
        }
        catch (e) {
            alert(e);
        }
    },
    getDevices: async function (selectId) {
        await new Promise((resolve, reject) => {
            if (!dwtObject) {
                resolve();
                return;
            }

            dwtObject.GetDevicesAsync(Dynamsoft.DWT.EnumDWT_DeviceType.TWAINSCANNER | Dynamsoft.DWT.EnumDWT_DeviceType.TWAINX64SCANNER | Dynamsoft.DWT.EnumDWT_DeviceType.ESCLSCANNER).then((sources) => {
                sourceList = sources;

                selectSources = document.getElementById(selectId);
                for (let i = 0; i < sources.length; i++) {
                    let option = document.createElement("option");
                    option.text = sources[i].displayName;
                    option.value = i.toString();
                    selectSources.add(option);
                }

                resolve();
            });
        });
    },
    acquireImage: async function (jsonString) {
        await new Promise((resolve, reject) => {
            if (!dwtObject || sourceList.length == 0) {
                resolve();
                return;
            }

            if (selectSources) {
                dwtObject.SelectDeviceAsync(sourceList[selectSources.selectedIndex]).then(() => {

                    return dwtObject.OpenSourceAsync()

                }).then(() => {

                    return dwtObject.AcquireImageAsync(JSON.parse(jsonString))

                }).then(() => {

                    if (dwtObject) {

                        dwtObject.CloseSource();

                    }

                    resolve();

                }).catch(

                    (e) => {

                        console.error(e);
                        resolve();

                    }

                )
            }
            else {
                resolve();
            }
        });
    },
    loadDocument: async function () {
        await new Promise((resolve, reject) => {
            if (!dwtObject) {
                resolve();
                return;
            }

            dwtObject.Addon.PDF.SetConvertMode(Dynamsoft.DWT.EnumDWT_ConvertMode.CM_RENDERALL);
            let ret = dwtObject.LoadImageEx("", Dynamsoft.DWT.EnumDWT_ImageType.IT_ALL);
            resolve();
        });
    },

    removeSelected: async function () {
        await new Promise((resolve, reject) => {
            if (!dwtObject) {
                resolve();
                return;
            }

            dwtObject.RemoveImage(dwtObject.CurrentImageIndexInBuffer);
            resolve();
        });

    },
    removeAll: async function () {
        await new Promise((resolve, reject) => {
            if (!dwtObject) {
                resolve();
                return;
            }

            dwtObject.RemoveAllImages();
            resolve();
        });

    },
    save: async function (type, name) {
        await new Promise((resolve, reject) => {
            if (!dwtObject) {
                resolve();
                return;
            }

            if (type == 0) {
                if (dwtObject.GetImageBitDepth(dwtObject.CurrentImageIndexInBuffer) == 1)
                    dwtObject.ConvertToGrayScale(dwtObject.CurrentImageIndexInBuffer);
                dwtObject.SaveAsJPEG(name + ".jpg", dwtObject.CurrentImageIndexInBuffer);
            }
            else if (type == 1)
                dwtObject.SaveAllAsMultiPageTIFF(name + ".tiff");
            else if (type == 2) {
                dwtObject.SaveAllAsPDF(name + ".pdf");
            }

            alert("Save successfully!");
            resolve();
        });
    }
};

// ---------------------------------------------------------------------------
// Hosted demo bootstrap
//
// index.demo.html sets window.DEMO_BUILD before this module loads. Activate
// immediately so that deep links (opening /mrzscanner directly, for example)
// do not have to wait for the Blazor UI to come up: the example pages await
// the activation via ensureActivated().
// ---------------------------------------------------------------------------
if (window.DEMO_BUILD) {
    startActivation(resolveLicenseKey());
}
