
// Configures class attributes to make progress bar look correct
function InitializeProgressBar() {
	let ul = document.getElementsByClassName("my-progress-bar")[0];
	let lis = ul.getElementsByTagName("li");

	// Fill the progress bar until last completed lesson
	let last_li;
	for (const li of lis) {
		last_li = li;
		if (li.className.includes("completed")) {
			li.className += " fill-bar";
		}
		else {
			break;
		}
	}

	// Set active tab to earliest uncompleted lesson
	last_li.className += " active";

	// Focus the corresponding div
	let a = last_li.getElementsByTagName("a")[0];
	let id = a.href.substring(a.href.lastIndexOf("#") + 1);
	console.log(id);
	let div = document.getElementById(id);
	div.className += " in active";
}