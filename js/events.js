/// <reference path="../libs/jquery-3.5.1.js" />

const EVENTS = true;

$(function () {

    // inputmask.js
    const regex = '([01][0-9]|2[0-3]):(00|15|30|45)';
    const placeholder = '00:00';
    $('.time-component input').inputmask({ regex, placeholder });


    // Adjust time buttons
    $('.time-component button').each(function () {
        const $btn = $(this);
        const $inp = $btn.closest('.time-component').find('input');
        //TODO: dynamic interval; 0 on start, then big and smaller with time
        const interval = 250;
        let timeout;
        updateSlots($inp);

        function adjustTimeInput() {
            let slots = updateSlots($inp);
            let valid;
            if ($btn.text() === '+') {
                valid = replaceSlots($inp, ++slots)
                // augmentSlots($inp, 1)
            } else if ($btn.text() === '-') {
                valid = replaceSlots($inp, --slots)
                // augmentSlots($inp, -1)
            }
            if (!valid) return;
            updateValue($inp);
            $inp.trigger('change');
        }

        $btn.on({
            mousedown: function () {
                adjustTimeInput();
                timeout = setInterval(function () {
                    adjustTimeInput();
                }, interval)
            },
            mouseup: function () {
                clearInterval(timeout);
                //$inp.trigger('change');
            },
            mouseleave: function () {
                if (timeout) $btn.trigger('mouseup');
            }
        });
    });

    // time-comp dependencies - separated from buttom handlers for code reusability
    $('.time-component').find('input').on({
        change: function () {
            const $this = $(this);
            // console.log(`Changed ${id} to ${$this.val()}`); // ---
            const $start = $('#startTime');
            const $dur = $('#durTime');
            const $end = $('#endTime');
            let $modify;
            // let $update;
            const slots = updateSlots($this);
            let correction;
            let valid;
            if ($this.is($start)) {
                console.log('%c its a start', 'color:red');
                correction = $start.data('slots') + $dur.data('slots');
                valid = replaceSlots($end, correction);
                if (!valid) { // 
                    if (correction > slotsInDay) {
                        correction = slotsInDay - $start.data('slots');
                        replaceSlots($dur, correction);
                        // $update = {$start, $dur};
                        $modify = $dur;
                        // return;
                    } else {
                        alert('SOMETHINGS VERY WRONG!')
                        return;
                    }
                }
                $modify = $modify ?? $end;
            } else if ($this.is($dur)) {
                console.log('%c its happening', 'color:green');
                correction = $start.data('slots') + $dur.data('slots');
                valid = replaceSlots($end, correction);
                if (!valid) {
                    if (correction > slotsInDay) {
                        correction = slotsInDay - $dur.data('slots');
                        replaceSlots($start, correction);
                        // $update = {$start, $end};
                        $modify = $start;
                        // return;
                    } else {
                        alert('Duration of an event cannot be shorter than 30 minutes!')
                        return;
                    }
                }
                $modify = $modify ?? $end;
            } else if ($this.is($end)) {
                console.log('%c its the end', 'color:blue');
                correction = $end.data('slots') - $dur.data('slots');
                valid = replaceSlots($start, correction);
                if (!valid) {
                    if (correction < 0) {
                        replaceSlots($dur, slots);
                        // $update = {$start, $end};
                        $modify = $dur;
                        //return;
                    } else {
                        alert('SOMETHINGS VERY WRONG!')
                        return;
                    }
                }
                $modify = $modify ?? $start;
            } else if ($this.is($('#fixedTime'))) {
                console.log('%c its the fix', 'color:white');
                return;
            } else {
                console.error('ROGUE TIME COMP?');
                return;
            }
            // $update = $update ?? $this;
            console.assert($modify, { $modify })
            updateValue($modify);

            // $update.trigger('update');
            console.info(`Starting time updated`);
            const block = readSelected();

            if (block) {
                // TODO: use GS.update
                GS.GRIDS[block.layer].update($('.eventBlock.selected')[0], {
                    y: $('#startTime').data('slots'),
                    h: $('#durTime').data('slots')
                });
            }
        }
    }) // }, <callback function with 'update' trigger>)
});



/* column add and remove buttons event handlers moved to calendar.js */


// Selecting block
$('#calendar').on('mousedown', function (event) {
    const $target = $(event.target).closest('#calendar .eventBlock');
    const $selected = $('#calendar .selected');
    if (!$target.length) {
        console.log(`#calendar clicked: NO block selected`);
        $selected.removeClass('selected');
        $('#destroyBlock').prop('disabled', true);
    } else if ($target.is($selected)) {
        console.log(`#calendar clicked: SAME block`);
    } else {
        $selected.removeClass('selected');
        $target.addClass('selected');
        console.log(`#calendar clicked: ${readSelected().id}`);
        updateEditor();
        $('#destroyBlock').prop('disabled', false);
    }
});


// TODO: consider creating 'selected' and 'editor' modules
// Transfer selected block info to Editor
function readSelected() {
    const $selected = $('.eventBlock.selected');
    if (!$selected.length) {
        return false;
    }
    const selected = {
        id: $selected.attr('gs-id'),
        name: $selected.find('p').text(),
        color: $selected.find('p').attr('data-color'),
        layer: $('.grid-stack').index($selected.closest('.grid-stack')),
        // MOD SLOTS DATA
        start: Number($selected.attr('gs-y')),
        dur: Number($selected.attr('gs-h')),
        //get end() { return this.start + this.start }
    }
    selected.end = selected.start + selected.dur;
    return selected;
}

function updateEditor() {
    let selected = readSelected();
    if (!selected) {
        return false;
    }
    //console.table(selected);
    $('#nameSet').val(selected.name);
    $('#colorSelect').val(selected.color);
    ///// color options check
    if ($('#colorSelect')[0].selectedIndex === -1) {
        addColorOption(selected.color);
        $('#colorSelect').val(selected.color);
    }
    /////
    $('#columnSelect').val(selected.layer);

    $('#startTime, #durTime, #endTime').each(function () {
        const $this = $(this);
        const id = $this.attr('id');
        const prop = id.split('Time')[0];
        replaceSlots($this, selected[prop]);
        updateValue($this);
    })

    // $('#startTime').val(selected.start);
    // $('#durTime').val(selected.dur);
    // $('#endTime').val(selected.end);
    return true;
}
function readEditor() {
    // let $selected = $('.eventBlock.selected');
    // if ($selected[0] == undefined) {
    //     return false;
    // }
    let editor = {
        id: randomID(),
        name: $('#nameSet').val(),
        color: $('#colorSelect').val(),
        layer: $('#columnSelect').val(),
        start: $('#startTime').data('slots'),
        dur: $('#durTime').data('slots'),
        end: $('#endTime').data('slots')
    }
    return editor;
}


// Save, load & reset
$('#saveBlocks').on({
    click: () => {
        BLOCKSET.saveStorage()
    }
});
$('#saveFile').on({
    click: () => {
        BLOCKSET.saveJSON();
        // BLOCKSET.updateBlocks()
        // let file = JSON.stringify(BLOCKSET.blocks);
        // $this = $('#saveFile');
        // $this.attr('href',
        //     window.URL.createObjectURL(
        //         new Blob([file], { type: "text/plain" })
        //     )
        // );
        // $this.attr('download', 'blocks.json')
    }
});

$('#loadBlocks').on({
    click: () => {
        if (confirm("This action will override all event blocks." +
            "\nDo you want to proceed?")) {
            BLOCKSET.loadStorage()
            // GS.overwriteCalendar();
        }
    }
});
$('#openFile').on({
    click: () => {
        if (confirm("This action will override all event blocks." +
            "\nDo you want to proceed?")) {
            BLOCKSET.loadJSON()
            // GS.overwriteCalendar();
        }
    }
});

$('#resetBlocks').on({
    click: () => {
        if (confirm("Are you sure you want to destroy your saved data?")) {
            BLOCKSET.resetStorage()
        }
    }
});


// Create & destroy buttons
$('#createBlock').on('mousedown', () => {
    const block = readEditor();
    GS.addBlock(block);
    console.log('CREATE BLOCK');
});

$('#destroyBlock').on('mousedown', () => {
    GS.removeBlock()
    console.log('DESTROY BLOCK');
});


$('#nameSet').on({
    focus: function () {
        this.select();
    },
    input: function () {
        console.log($(this).val());
        const block = readSelected();
        if (block) {
            block.name = $(this).val();
            GS.updateBlock(block);
        }
    }
});

// Editor fields on change
$('#colorSelect, #columnSelect, #startTime, #durTime, #endTime') // #nameSet
    .on('change', (event) => {
        let changed = $(event.target).attr('id');
        const selected = readSelected();
        const block = readEditor();
        block.id = selected.id; // replace random id with selected id
        if (!selected) {
            return;
        }
        console.group('Editor events');
        console.dir(block);
        console.info(`Editor field ${changed} changed`);

        if (changed == 'columnSelect') {
            GS.removeBlock(); // ~$('.selected')[0]~;
            GS.addBlock(block);
        } else {
            GS.updateBlock(block);
        }
        if (changed == 'colorSelect') colorizeBlocks($('.selected'));

        // console.log(event.target);
        console.groupEnd();
    });


////// Data functions - time comp ////////////
function updateValue($inputTime) {
    if (typeof $inputTime === 'undefined') return false;
    const slots = $inputTime.data('slots');

    const time = ($inputTime.is($('#endTime')) && slots === slotsInDay) ? '00:00' : slotToTime(slots);
    $inputTime.val(time);

    // debug data('slots')
    // $inputTime.closest('.time-component').find('label').text($inputTime.data('slots'));

    return time;
}

function updateSlots($inputTime) {
    if (typeof $inputTime === 'undefined') return false;
    const time = $inputTime.val();

    // const slots = ($inputTime.is($('#endTime')) && time === '00:00') ? slotsInDay : timeToSlot(time);
    let slots;

    if ($inputTime.is($('#startTime')) && time === '23:45') {
        updateValue($inputTime);
        alert('Duration of an event cannot be shorter than 30 minutes!')
        return false;
    } else if ($inputTime.is($('#durTime')) && time === '00:15') {
        updateValue($inputTime);
        alert('Duration of an event cannot be shorter than 30 minutes!')
        return false;
    } else if ($inputTime.is($('#endTime')) && time === '00:00') {
        slots = slotsInDay;
    } else {
        slots = timeToSlot(time);
    }
    $inputTime.data('slots', slots);

    // debug data('slots')
    // $inputTime.closest('.time-component').find('label').text(slots);

    return slots;
}

function replaceSlots($inputTime, replacement) {
    if (typeof $inputTime === 'undefined' || replacement < 0 || replacement > slotsInDay)
        return false;
    if ($inputTime.is($('#startTime')) && replacement > 94) return false;
    else if ($inputTime.is($('#durTime')) && replacement < 2) return false;
    else if ($inputTime.is($('#endTime')) && replacement < 2) return false;
    // else return false;

    $inputTime.data('slots', replacement);

    // debug data('slots')
    // $inputTime.closest('.time-component').find('label').text(replacement);

    return true;
}

