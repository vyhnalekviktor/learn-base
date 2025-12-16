<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Support BaseCamp</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h1>Support the Creator</h1>
        <p>Help me keep BaseCamp free and awesome!</p>

        <div id="walletInfo" style="display:none;">
            <p>Connected: <strong id="address">-</strong></p>
        </div>

        <div id="paymentButtons" style="opacity:0.5;pointer-events:none;">
            <button onclick="donate('1')">Donate $1</button>
            <button onclick="donate('5')">Donate $5</button>
            <button onclick="donate('10')">Donate $10</button>
        </div>

        <div id="customPayment" style="opacity:0.5;pointer-events:none;">
            <input type="number" id="customAmount" placeholder="Custom amount" min="0.5" step="0.1">
            <button onclick="donateCustom()">Send Custom</button>
        </div>

        <div id="status"></div>
    </div>

    <script type="module" src="src/payment.js"></script>
</body>
</html>
