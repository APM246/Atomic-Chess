
// Configures class attributes to make progress bar look correct
function InitializeProgressBar() {
	let ul = document.getElementsByClassName("ac-progress-bar")[0];
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
	let a = last_li.getElementsByTagName("a")[0];
	a.className += " active";

	// Focus the corresponding div
	let id = a.href.substring(a.href.lastIndexOf("#") + 1);
	let div = document.getElementById(id);
	div.className += " active show";
}