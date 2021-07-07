# Blazor Barcode Sample
The sample shows how to implement a web barcode reader app by using [Dynamsoft JavaScript Barcode SDK](https://www.dynamsoft.com/Products/barcode-recognition-javascript.aspx) and [Blazor WebAssembly](https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor).

## Usage
1. Get a trial license from [Dynamsoft portal](https://www.dynamsoft.com/CustomerPortal/Portal/Triallicense.aspx) and then update the following line in `wwwroot/index.html`:
  
    ```html
    <script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@8.4.0/dist/dbr.js" data-productKeys="LICENSE-KEY"></script>
    ```
    
2. Run the app:

    ```
    dotnet run
    ```
    
3. Visit `locahost:5000` to read barcode files:

    ![code93 image](https://www.dynamsoft.com/codepool/wp-content/uploads/2020/09/code93.png)
    
    ![blazor barcode sample](https://www.dynamsoft.com/codepool/wp-content/uploads/2020/09/blazor-barcode-result.png)

    
## Blog
[How to Build Web Barcode Reader with Blazor WebAssembly](https://www.dynamsoft.com/codepool/web-barcode-reader-blazor-webassembly.html)
