
const {remote} = nodeRequire('electron')
const {app, TouchBar} = remote
const {TouchBarLabel, TouchBarButton, TouchBarSpacer} = TouchBar
const default_msg = "00:00:00"
const done_msg = "DONE!!!!"
const start_btn = "Start"
const pause_btn = "Pause"
const resume_btn = "Resume"


var current_timer_date = undefined;
var paused_timer_remaining_millis = undefined;
var timer = undefined;
var states = {
    "initial": 0,
    "running": 1,
    "paused": 2,
    "done": 3
}
var current_state = states.initial;

$(document).ready(function(){
    initHandlers();
})

function initHandlers() {
    $("#btnStartPauseResume").click(handleStartPauseResumeButtonClick)
    $("#btnCancel").click(handleCancelButtonClick)
    $("#txtStartTimerInput").change(handleTimerInputChange); 
    $(document).keypress(handleKeypress)
    app.on('browser-window-blur', handleWindowBlur)
    app.on('browser-window-focus', handleWindowFocus)
}

function handleStartPauseResumeButtonClick(event, window) {
    $("#btnStartPauseResume").blur();
    $("#btnCancel").blur();
    if (current_state == states.running) {
        pauseTimer();
    } else if (current_state == states.initial) {
        startTimer();
    } else if (current_state == states.paused) {
        resumeTimer();
    }
}

function handleCancelButtonClick(event, window) {
    $("#btnStartPauseResume").blur();
    $("#btnCancel").blur();
    cancelTimer();
}

function handleTimerInputChange(event, window) {
    
}

function handleKeypress(e) {
    console.log("Keypressed: "+e.key+" - Current state: "+current_state);
    if (e.key == "Enter") {
        if (current_state == states.running) {
            pauseTimer();
        } else if (current_state == states.done || current_state == states.initial) {
            startTimer()
        } else {
            resumeTimer();
        }
    }
    if (e.key == "x") {
        if (current_state == states.paused || current_state == states.running) {
            cancelTimer();
            e.preventDefault();
        }
    }
}

function handleWindowBlur(event, window) {
    if (current_state == states.done) {
        app.dock.bounce('critical')
        current_state = states.initial;
    }
}

function handleWindowFocus(event, window) {
    $("#txtStartTimerInput").focus(); 
    $("#txtStartTimerInput").select(); 
}

function startTimer() {
    console.log("Starting timer")
    if (updateCurrentTimerDate()) {
        current_state = states.running
        window.clearInterval(timer);
        timer = window.setInterval(tick, 200);
        $("#btnStartPauseResume").prop('value', pause_btn);
        $("#txtStartTimerInput").prop("readonly", true);
        showCancelButton();    
    }
}

function pauseTimer() {
    console.log("Pausing timer")
    current_state = states.paused;
    paused_timer_remaining_millis = getRemainingMillis()
    window.clearInterval(timer);
    $("#btnStartPauseResume").prop('value', resume_btn);
    showCancelButton();
}

function resumeTimer() {
    console.log("Resuming timer")
    current_state = states.running
    var d = new Date();
    current_timer_date.setTime(d.getTime() + paused_timer_remaining_millis)
    window.clearInterval(timer);
    timer = window.setInterval(tick, 200);
    $("#btnStartPauseResume").prop('value', pause_btn);
    showCancelButton();
}

function cancelTimer() {
    $("#btnStartPauseResume").prop('value', start_btn);
    hideCancelButton();
    current_state = states.initial;
    window.clearInterval(timer);
    current_timer_date = undefined;
    paused_timer_remaining_millis = undefined;
    timer = undefined;
    $("#txtStartTimerInput").prop("readonly", false);
    $("#lblTimer").text(default_msg);
}

function updateCurrentTimerDate() {
    var time_val = $("#txtStartTimerInput").val();
    var miltime = new RegExp("^([01]?[0-9]|2[0-3]):([0-5][0-9])$");
    var time = new RegExp("^(0?[0-9]|1[0-2]):([0-5][0-9]) *(a|p)m?$");
    var duration = new RegExp("^(\\d+) *([Ss]?|[Mm]?|[Hh]?)?.*$");
    var result = undefined
    var type = undefined
    var newDate = undefined

    if (result = time_val.match(miltime)) {
        type = "miltime"
        newDate = getDateFromMiltimeResults(result)
    } else if (result = time_val.match(time)) {
        type = "time"
        newDate = getDateFromTimeResults(result)
    } else if (result = time_val.match(duration)) {
        type = "duration"
        newDate = getDateFromDurationResults(result)
    } else {
        alert("Invalid format.  Please use something like the following:  2m, 2 minutes, 30 seconds, 23:30, 12:00pm")
        cancelTimer();
        return false;
    }

    console.log("Setting current timer date: "+newDate)
    current_timer_date = newDate;
    return true;
}

function tick() {
    var remainingTime = getRemainingMillis();
    if (remainingTime < 1000) {
        timerEnd();
    } else {
        var value = millisToHoursMinutesSeconds(remainingTime);
        $("#lblTimer").text(value);
    }
}

function timerEnd() {
    app.focus();
    current_state = states.done
    $("#btnStartPauseResume").prop('value', start_btn);
    hideCancelButton();
    $("#lblTimer").text(done_msg);
    window.clearInterval(timer);
    window.setTimeout(() =>current_state = states.initial, 3000)
    current_timer_date = undefined;
    paused_timer_remaining_millis = undefined;
    timer = undefined;
    $("#txtStartTimerInput").prop("readonly", false);
}

function getRemainingMillis() {
    return current_timer_date.getTime() - new Date().getTime();
}

function millisToHoursMinutesSeconds(millis) {
    var seconds = 0;
    var minutes = 0;
    var hours = 0;

    seconds = Math.floor(millis / 1000);

    minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds - (minutes * 60));

    hours = Math.floor(minutes / 60);
    minutes = minutes - (hours * 60);

    return formatTimeSection(hours)+":"+formatTimeSection(minutes)+":"+formatTimeSection(seconds);

}

function formatTimeSection(val) {
    if (val.toString().length < 2) {
        return "0"+val
    } else {
        return val;
    }
}

function getDateFromMiltimeResults(val) {
    var d = new Date();
    
    // Hours
    if (d.getHours() > val[1]) { //already past the time, add 24 hours to the value
        val[1] = parseInt(val[1]) + 24;
    }

    // Minutes
    if (d.getHours() == val[1] && d.getMinutes() > val[2]) { //already past the time, add 24 hours to the value
        val[1] = parseInt(val[1]) + 24; // Add a day because the minutes were before now, so go to the next day
    }

    d.setHours(val[1]);
    d.setMinutes(val[2]);
    return d;

}

function getDateFromTimeResults(val) {
    console.log('getDateFromTimeResults -- '+val)
    val = convertResultsToMilitary(val);
    return getDateFromMiltimeResults(val);
}

function getDateFromDurationResults(val) {
    // 3s,3,s
    console.log(val);

    var d = new Date();

    // get first character of duration part to figure if seconds, minutes, or hours
    // If no character, assume minutes
    var duration_type = undefined;
    if (val[2]) {
        duration_type = val[2].charAt(0).toLowerCase();
    } else {
        duration_type = "m";
    }
    switch (duration_type) {
        case "s":
            console.log("seconds")
            d.setSeconds(d.getSeconds() + parseInt(val[1]));
            break;
        case "h":
            console.log("hours")
            d.setHours(d.getHours() + parseInt(val[1]));
            break;
        default:
            console.log("minutes")
            d.setMinutes(d.getMinutes() + parseInt(val[1]));
            break;
    }

    return d;
}

/**
 * Take a result from parsing a proposedTimerValue with a Time or Military time regular expression
 * @param  array val 
 * @return array
 */
function convertResultsToMilitary(val) {

    if (val[3] == "a" && val[1] == 12) { // 12 am means midnight or 00 military time
        val[1] = 0
    } else if (val[3] == "p" && val[1] == 12) { // 12 pm means 12 military time, do nothing
        // Do nothing
    } else if (val[3] == "p") { // any other pm time needs 12 added
        val[1] = parseInt(val[1]) + 12;
    }
    return val;
}

function setupTouchBar() {
    console.log("Setting up touch bar")
    var threeMinutes = new TouchBarButton({
        label: '3 Minutes',
        click: () => {
            $("#txtStartTimerInput").val("3 Minutes");
            startTimer();
        }
    })
    var fiveMinutes = new TouchBarButton({
        label: '5 Minutes',
        click: () => {
            $("#txtStartTimerInput").val("5 Minutes");
            startTimer();
        }
    })
    var tenMinutes = new TouchBarButton({
        label: '10 Minutes',
        click: () => {
            $("#txtStartTimerInput").val("10 Minutes");
            startTimer();
        }
    })
    var thirtyMinutes = new TouchBarButton({
        label: '30 Minutes',
        click: () => {
            $("#txtStartTimerInput").val("30 Minutes");
            startTimer();
        }
    })
    var oneHour = new TouchBarButton({
        label: '1 Hour',
        click: () => {
            $("#txtStartTimerInput").val("1 Hour");
            startTimer();
        }
    })
    var twoHours = new TouchBarButton({
        label: '2 Hours',
        click: () => {
            $("#txtStartTimerInput").val("2 Hours");
            startTimer();
        }
    })
    var fourHours = new TouchBarButton({
        label: '4 Hours',
        click: () => {
            $("#txtStartTimerInput").val("4 Hours");
            startTimer();
        }
    })
    var touchBar = new TouchBar([
        new TouchBarSpacer({size: 'flexible'}),
        threeMinutes,
        fiveMinutes,
        tenMinutes,
        thirtyMinutes,
        oneHour,
        twoHours,
        fourHours,
        new TouchBarSpacer({size: 'flexible'}),
    ])
    remote.getCurrentWindow().setTouchBar(touchBar)
}

function showCancelButton() {
    $("#btnCancel").addClass("show");
    $("#btnCancel").removeClass("hide");
}

function hideCancelButton() {
    $("#btnCancel").addClass("hide");
    $("#btnCancel").removeClass("show");
}

window.onload = function() {
    setupTouchBar();
    $("#txtStartTimerInput").focus();
};
