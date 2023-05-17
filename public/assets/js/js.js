function changeQuantity(productId,count,productPrice){
    let quantity=parseInt(document.getElementById(productId).value)
    let stockVal=parseInt(document.getElementById('stocks-'+productId).value)
    let Count=parseInt(count)
    let price = parseFloat(productPrice);

    if(stockVal-(count)>=0){
    $.ajax({
        url:'/change-product-quantity',
        data:{
            product:productId,
            count:Count,
            quantity:quantity
        },
        method:'post',
        success:(response)=>{
            if(response.removeProduct){
                alert("Product removed from cart")
                location.reload()
            }else{
                document.getElementById(productId).value=quantity+count
                document.getElementById('total').innerHTML=response.total
                document.getElementById('total1').innerHTML=response.total-3
                document.getElementById('sub-'+productId).innerHTML = (price * (quantity+count))
                document.getElementById('stocks-'+productId).value=stockVal-count
                if (stockVal - count === 0) {
                    document.getElementById('out-of-stock-' + productId).style.display = 'inline'
                    document.getElementById('stocks-'+productId).style.display = 'none'
                }else{
                    document.getElementById('out-of-stock-' + productId).style.display = 'none'
                    document.getElementById('stocks-'+productId).style.display = 'inline'
                }
            }
        }    
    })

    }
}




