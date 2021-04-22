document.body.onload = addElement;

function addElement() {
  const newDiv = document.createElement("div");
  const newContent = document.createTextNode(`Successfully loaded external email js file for ${identity}`);
  newDiv.appendChild(newContent);
  const currentDiv = document.getElementById("div1");
  currentDiv.parentNode.insertBefore(newDiv, currentDiv);
}