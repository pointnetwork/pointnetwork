export function toFixedFloor(num, fixed) {
    var re = new RegExp('^-?\\d+(?:.\\d{0,' + (fixed || -1) + '})?');
    const withoutPadding = num.toString().match(re)[0];
    return Number(withoutPadding).toFixed(fixed);
}
