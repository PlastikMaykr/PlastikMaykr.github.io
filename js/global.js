// TODO: turn this into object(s)
const slotsPerHour = 4;
const minutesInSlot = 15;
const pixelsPerMinute = 1;
const pixelsInSlot = minutesInSlot * pixelsPerMinute;
const hoursInDay = 24;
const slotsInDay = 96; // hoursInDay * slotsPerHour;
const minSlots = 2;

const TAU = Math.PI * 2;
const degreesInTurn = 360;

//////////// DOM manipulation ///////////
$(function () {
    // generate calendar ruler marks
    const $ruler = $('#ruler');
    for (let i = 0; i < hoursInDay; i++) {
        // console.count('loop');
        $ruler.append(`<span>${doubleDigit(i)}:00</span>`);
    }

    // generate select options based on array of colors
    const colors = [
        "dimgrey",
        "sienna",
        "darkred",
        "orangered",
        "gold",
        "yellowgreen",
        "limegreen",
        "turquoise",
        "royalblue",
        "indigo",
        "hotpink",
        "seashell",
    ];
    colors.forEach((color) => addColorOption(color));
    // TODO: D3 color select palette generator
});

function addColorOption(color) {
    const Color = color[0].toUpperCase() + color.substring(1);
    $(`<option value="${color}">${Color}</option>`)
        .appendTo($('#colorSelect'))
        .css('background-color', color);
}

// Time indicator
// function updateTimeIndicators() {
//     let thisTime = new Date();
//     // date to minutes
//     let timeIndicatorY = thisTime.getHours() * 60 + thisTime.getMinutes();
//     $('#timeIndicator').get(0).style.transform = `translate(0, ${timeIndicatorY}px)`;

//     let timeIndicatorAngle = timeIndicatorY / (pixelsInSlot * slotsInDay) * 360;
//     $('#⭕clockface line').attr('transform',`rotate(${timeIndicatorAngle})`);
// }
// updateTimeIndicators();
// setInterval(updateTimeIndicators, 60000); // 60000ms = 1min


// $('.selected').find('p').data('color')
function colorizeBlocks(eventBlocks = $('.eventBlock')) {
    // console.log({eventBlocks});
    if (eventBlocks[0] == undefined) {
        console.error(`No blocks to color!`);
        return false;
    }
    console.groupCollapsed('Colorize blocks')
    // console.trace('colorize')
    console.log({ eventBlocks });
    // TODO: rewrite this section to be more elegant
    eventBlocks.each(function (i) {
        let $block = $(this);
        console.log({ $block });
        let current = $block[0].style.getPropertyValue('background-color');
        let color = $block.find('p').attr('data-color');
        if (!current) {
            $block.css('background-color', color);
            console.log(`Block #${i} color applied: ${color}`);
        } else if (current !== color) {
            $block.css('background-color', color);
            console.log(`Changed block #${i} color to ${color}`);
        } else {
            console.log(`Block #${i} color is already ${color}`);
        }
    });
    console.groupEnd();
}


//////////// General functions ///////////
function randomID() {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idLength = 4;
    for (let i = 0; i < idLength; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function doubleDigit(number) {
    number = String(number);
    if (number.length == 1) number = '0' + number;
    return number;
}

// Time-slots conversion functions
function slotToTime(slots) {
    let mins = slots * 15;
    let hh = ('0' + Math.floor(mins / 60)).slice(-2);
    let mm = ('0' + mins % 60).slice(-2);
    return `${hh}:${mm}`;
}
function timeToSlot(time) {
    //TODO: validate time
    time = time.split(':');
    let slots = time[0] * 4 + time[1] / 15;
    return Math.round(slots);
}

