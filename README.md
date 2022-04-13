# Blazor Barcode Sample
The sample shows how to implement a web barcode reader app by using [Dynamsoft JavaScript Barcode SDK](https://www.dynamsoft.com/Products/barcode-recognition-javascript.aspx) and [Blazor WebAssembly](https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor).

## Usage
1. Get a trial license from [Dynamsoft portal](https://www.dynamsoft.com/CustomerPortal/Portal/Triallicense.aspx) and then update the following line in `wwwroot/jsInterop.js`:
  
    ```js
    Dynamsoft.DBR.BarcodeReader.license = "license key placeholder";
    ```
    
2. Run the app:

    ```
    dotnet run
    ```
    
3. Visit `locahost:5000` to read barcode files or do a live scan:

    ![code93 image](https://www.dynamsoft.com/codepool/wp-content/uploads/2020/09/code93.png)
    
    ![blazor barcode sample](https://www.dynamsoft.com/codepool/img/2020/09/blazor-barcode-result.png)

    
## Blog
[How to Build Web Barcode Reader with Blazor WebAssembly](https://www.dynamsoft.com/codepool/web-barcode-reader-blazor-webassembly.html)
