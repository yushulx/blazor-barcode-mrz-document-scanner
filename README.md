# Blazor Barcode and QR Code Reader
The sample shows how to implement a web barcode and QR code reader app by using [Dynamsoft JavaScript Barcode SDK](https://www.dynamsoft.com/Products/barcode-recognition-javascript.aspx) and [Blazor WebAssembly](https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor).

## Usage
1. Get a trial license from [Dynamsoft portal](https://www.dynamsoft.com/customer/license/trialLicense?product=dbr) and then update the following line in `wwwroot/jsInterop.js`:
  
    ```js
    Dynamsoft.DBR.BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
    ```
    
2. Run the app:

    ```
    dotnet run
    ```
    
3. Visit `locahost:5000` to read barcode files or do a live scan:

    ![code93 image](https://www.dynamsoft.com/codepool/wp-content/uploads/2020/09/code93.png)
    
    ![blazor barcode sample](https://www.dynamsoft.com/codepool/img/2020/09/blazor-barcode-result.png)

## Online Demo
[https://yushulx.me/blazor-barcode-qrcode-reader-scanner/](https://yushulx.me/blazor-barcode-qrcode-reader-scanner/)

## Blog
[How to Build Web Barcode Reader with Blazor WebAssembly](https://www.dynamsoft.com/codepool/web-barcode-reader-blazor-webassembly.html)
