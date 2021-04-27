// Configures class attributes to make progress bar look correct
function InitializeProgressBar() {
    const ul = document.getElementsByClassName("ac-progress-bar")[0];
    const lis = ul.getElementsByTagName("li");

    // Fill the progress bar until last completed lesson
    let lastLi = null;
    for (const li of lis) {
        lastLi = li;
        if (li.className.includes("completed")) {
            li.className += " fill-bar";
        } else {
            break;
        }
    }

    if (lastLi) {
        // Set active tab to earliest uncompleted lesson
        const a = lastLi.getElementsByTagName("a")[0];
        a.className += " active";

        // Focus the corresponding div
        const id = a.href.substring(a.href.lastIndexOf("#") + 1);
        const div = document.getElementById(id);
        div.className += " active show";
    }
}
