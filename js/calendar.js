/// <reference path="../libs/gridstack-all.js" />
/// <reference path="../libs/jquery-3.5.1.js" />

//const { GridStack } = require("../libs/gridstack-all");

const PLACEHOLDERS = [[
    { x: 0, y: 5, h: 5, minH: minSlots, id: randomID(), content: '<p data-color="purple">Time</p>' },
    { x: 0, y: 10, h: 10, minH: minSlots, id: randomID(), content: '<p data-color="green">Place</p>' },
    { x: 0, y: 28, h: 20, minH: minSlots, id: randomID(), content: '<p data-color="blue">Spacetime</p>' }
],
[
    { x: 0, y: 8, h: 8, minH: minSlots, id: randomID(), content: '<p data-color="orange">Wormhole</p>' },
    { x: 0, y: 20, h: 2, minH: minSlots, id: randomID(), content: '<p data-color="teal">Mind, body, spirit</p>' }
]];


///////////// GridStack Module /////////////////////////
const GS = (function () {

    // variables
    let GRIDS = [];
    const options = {
        float: true,
        column: 1,
        row: slotsInDay,
        margin: 0,
        height: 5,
        cellHeight: 15,
        cellHeightUnit: 'px',
        // removable: '.trash',
        draggable: { scroll: true },
        dragOut: true,
        acceptWidgets: true,
        itemClass: 'eventBlock',
        resizable: { handles: 's' }
    };

    /// 🚀 Launch GS ///
    initialize();
    // try to load block from storage
    overwriteCalendar();
    colorizeBlocks();
    /////////////////

    function initialize() { // init and return all grids
        GRIDS = GridStack.initAll(options);
        
        GRIDS.forEach(function (grid, index) {
            attachGSEvents(index);
        });

        $('#removeColumn button').each(function () {
            $(this).on('click', columnRemovalButtonEvent);
        })

        $('#addColumn button').on('click', () => {
            if (GRIDS.length < 5) {
                addColumn();
                console.info('Adding a column');
            } else {
                alert(`Can't have more than 5 columns!`);
            }
        });
    }

    function addColumn() { // add and init new grid
        const calendar = $('#calendar').get(0);
        GRIDS.push(GridStack.addGrid(calendar, options));
        attachGSEvents(GRIDS.length - 1);
        updateColumnDropdown();

        // add column removal button with event handler
        // TODO: icon
        $(`<button id="remCol">|-|</button>`).appendTo($('#removeColumn'))
            .on('click', columnRemovalButtonEvent);

        // update chart
        if (typeof CHART !== 'undefined') CHART.updater(addColumn.name);
    }
    function removeColumn(index = GRIDS.length - 1) {
        // update Destroy block button
        if ($(GRIDS[index].el).has('.selected').length) {
            $('#destroyBlock').prop('disabled', true);
        }
        
        // remove column from DOM and grid from GRIDS
        GRIDS[index].destroy();
        GRIDS.splice(index, 1);
        updateColumnDropdown();

        // update chart
        CHART.updater(removeColumn.name);
        // CHART.updater('removeColumn');
        // CHART.renderClockChart();
    }

    function attachGSEvents(index) {
        if (typeof index === 'undefined') return false;
        
        // TODO: take closer look on what GS event triggers
        //       on event block content update
        GRIDS[index].on('added change removed', function (event, gsItem) {
            console.group('GS event');
            console.log(event);
            // console.log({EVENTS,CHART});
            if (typeof EVENTS !== 'undefined') updateEditor();
            if (typeof CHART !== 'undefined') CHART.updater('GRIDS event');
            // console.trace('GS event');
            console.info(`Column [${index}]: ${gsItem[0].id} was ${event.type}`);
            console.log( gsItem );
            let $block = $(gsItem[0].el);
            console.groupEnd();
            if (event.type == 'added') {
                $('.eventBlock.selected').removeClass('selected');
                $block.addClass('selected');
                colorizeBlocks($block);
                updateEditor();
            }
        });
    }
    function columnRemovalButtonEvent(event) {
        if (GRIDS.length > 2) {
            // TODO: check if there are any blocks, otherwise confirm is not required
            if (confirm("Are you sure you want to delete column" +
                "\nand all of its content?")) {
                const button = $(event.target).closest('button');
                const buttonIndex = $(button).index();
                removeColumn(buttonIndex);
                button.remove();
                console.info(`Removed ${buttonIndex + 1}. column`);
            } else {
                console.info(`Canceled removing a column`);
            }
        } else {
            alert(`Can't have less than 2 columns!`);
        }
    }

    function updateColumnDropdown() {
        let select = $('#columnSelect');
        let options = $('#columnSelect option');
        for (let i = 0; i < options.length; i++) {
            //console.log( {i} )
            if (i < GRIDS.length) {
                options.eq(i).prop('hidden', false);
                //console.log('Show ' + select.eq(i).text());
            } else {
                options.eq(i).prop('hidden', true);
                //console.log('Hide ' + select.eq(i).text());
                if (Number(select.val()) == i) {
                    console.log('Selected column is no more!')
                    select.val(i - 1);
                }
            }
        }
    }

    function addBlock(block) {
        const gsItem = blockToGSitem(block);
        GRIDS[block.layer].addWidget(gsItem);
    }
    function updateBlock(block) {
        console.group('Update block');
        console.log(block);
        // console.trace('Update block');
        const gsItem = blockToGSitem(block);
        console.log(gsItem);
        GRIDS[block.layer].update($('.eventBlock.selected')[0], gsItem);
        console.groupEnd();

        // updating a block doesn't trigger GRID 'change' event
        // so chart needs to be updated here as well
        CHART.updater(updateBlock.name);
    }
    // TODO: think about scenerios for removing block other then .selected
    function removeBlock(block = $('.eventBlock.selected')[0]) {
        // $(`.eventBlock[gs-id="${block.id}"]`)
        const selected = readSelected();
        GRIDS[selected.layer].removeWidget(block);
    }

    function overwriteCalendar(flatBlocks = BLOCKSET.blocks) {
        console.group('Load & override blocks')
        //////////////////////////////
        // TODO: check which columns are occupied on calendar
        //       vs in loaded data; inform user which columns
        //       are going to be overwritten & which are 'safe'
        //////////////////////////////

        // check for & replace overlapping IDs
        const newIds = flatBlocks.map(block => block.id);
        const existingIds = readCalendar().map(block => block.id);

        newIds.forEach((id, index) => {
            if (existingIds.indexOf(id) !== -1) {
                flatBlocks[index].id = randomID();
                console.log(`Changing overlapping id "${id}" to "${flatBlocks[index].id}"`)
            }
        });

        // convert blocks to GSitems
        const grouppedBlocks = groupify(flatBlocks);
        const grouppedGSitems = (() => {
            return grouppedBlocks.map((layerOfBlocks) => {
                return layerOfBlocks.map((block) => {
                    return blockToGSitem(block)
                });
            });
        })();

        // add new columns if 'blocks' is longer than 'GRIDS'
        for (let missingColumns = grouppedGSitems.length - GRIDS.length;
            0 < missingColumns; missingColumns--) {
            addColumn();
        }

        console.groupEnd();

        // add groups of blocks to grids
        grouppedGSitems.forEach((group, index) => {
            GRIDS[index].load(group);
        });

        // colorize all blocks
        colorizeBlocks();
    }
    function readCalendar() {
        let flatBlocks = [];
        GRIDS.forEach(function (grid, index) {
            let gridItems = grid.save();
            // console.dir(gridItems);
            gridItems.forEach((gsItem) => {
                // replace bad 'y' from 'save()' with correct 'gs-y'
                let gsY = $(`.eventBlock[gs-id="${gsItem.id}"]`).attr('gs-y');
                gsItem.y = Number(gsY);
                // console.log(gsItem.y);
                // console.log($(`[gs-id="${gsItem.id}"]`).attr('gs-y'));
            });
        
            let gridBlocks = gridItems.map(item => gsItemToBlock(item, index));
            flatBlocks.push(...gridBlocks);
            // console.log(flatBlocks);
        });
        return flatBlocks;
    }

    function groupify(blocks = BLOCKSET.blocks) { // blocks = BLOCKSET.blocks
        return Array.from(d3.group(blocks, d => d.layer), d => d[1])
    }

    function blockToGSitem(block) {
        return {
            x: 0,
            y: block.start,
            h: block.dur,
            minH: minSlots,
            id: block.id,
            content: `<p data-color="${block.color}">${block.name}</p>`
        }
    }
    function gsItemToBlock(gsItem, column = 0) {
        const content = gsItem.content,
            id = gsItem.id,
            name = $(content).text(),
            color = $(content).data('color'),
            start = gsItem.y,
            dur = gsItem.h || minSlots,
            end = start + dur,
            layer = column;
        return { id, name, color, start, dur, end, layer }
    }

    return {
        GRIDS,
        addColumn,
        removeColumn,
        addBlock,
        updateBlock,
        removeBlock,
        overwriteCalendar,
        readCalendar
    }
})();

