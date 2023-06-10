/// <reference path="../libs/d3.js" />

///////// Chart settings events /////////// @note events
$('#dialDirection').on('change', function (event) { // 'mousedown'
    console.log(event.target);
    // const $target = $(event.target)//.addClass('active');
    // const sibs = $target.siblings('.active').removeClass('active');
    // const dialDirection = $target.children('input').attr('id').split('Dir')[0];
    // const dialDirection = $target.attr('for').split('Dir')[0];
    const dialDirection = $('#dialDirection input:checked').attr('id').split('Dir')[0];
    console.log(dialDirection);
    dialDirection === 'fixed' ? $('#time-Fixed').show() : $('#time-Fixed').hide();
    CHART.updater('dialDirection');
});
$('#dialRange').on('change', function (event) {
    // const $target = $(event.target)//.addClass('active');
    // const sibs = $target.siblings('.active').removeClass('active');
    // const dialRange = $target.attr('for').split('Day')[0];
    const dialRange = $('#dialRange input:checked').attr('id').split('Dir')[0];
    console.log(dialRange);
    CHART.updater('dialRange');
});

$('#chart-fit').on('change', function (event) {
    const chartFit = $('#chart-fit input:checked').attr('id').split('chart-fit-')[1];
    // console.log(chartFit);
    chartFit === 'fit' ?
        $('#chart-container').addClass('fit') : $('#chart-container').removeClass('fit');
    // $($0).css('--margin','0')
});

$('#fixedTime').on('change', function (e) {
    CHART.updater('fixedTime');
});


//FIXME: foreignObject is always selected
$('#⭕chart').on('click', (event) => {
    console.log('Clock chart clicked', event.target.tagName);
    CHART.updater('chart');
});


///////// Chart module ///////////
const CHART = (function () {
    // DATA
    let flat,
        nested,
        columns,
        populated;

    // FLAGS
    let revolutionInterval,
        maxSlots = slotsInDay, // 96 for 24h
        timescale,
        marksStep = TAU / maxSlots * 4, // radians per hour
        dialRange,
        dialDirection,
        // fixedTimeSlots,  
        firstPie;

    function updateSettings() { // TODO: pass caller and update selectively
        // or better yet: implement full blown MVC/MVP pattern
        // dialRange = $('#dialRange > label.active input').attr('id').split('Day')[0];
        dialRange = $('#dialRange input:checked').attr('id').split('Day')[0];
        timescale = dialRange === 'full' ? hoursInDay : hoursInDay / 2;
        maxSlots = timescale * slotsPerHour
        marksStep = TAU / maxSlots * 4; // radians per hour

        // dialDirection = $('#dialDirection > .active input').attr('id').split('Dir')[0];
        dialDirection = $('#dialDirection input:checked').attr('id').split('Dir')[0];
        // fixedTimeSlots = $('#fixedTime').data('slots');
        // nowTimeSlots = Math.round(timeToSlot(getTime().extended));
        firstPie = $('#firstPie').hasClass('active');
        return {
            dialRange,
            timescale,
            maxSlots,
            marksStep,
            dialDirection,
            // fixedTimeSlots,
            // nowTimeSlots,
            firstPie,
        }
    };
    /////////////////////////////

    const dataSectioner = () => { // @audit-ok data section

        const hoursToSlots = d3.scaleLinear()
            .domain([0, hoursInDay]) // timescale
            .range([0, slotsInDay]); // maxSlots

        const timeRangeRaw = getTime().range;
        const timeRangeCrosses = function () {
            if (timeRangeRaw[0] < 0) return 0;
            else if (24 < timeRangeRaw[1]) return 24;
            else return; // 12;
        }();
        const slotRangeRaw = timeRangeRaw.map(hour => hoursToSlots(hour));

        let dataSection = [];

        // filtering - works
        const slotRanges = function () {
            let range, // = [],
                low = slotRangeRaw[0],
                high = slotRangeRaw[1];

            if (low < 0) {
                low += slotsInDay;
                range = {
                    'early': [low, slotsInDay],
                    'normal': [0, high]
                };
            } else if (high > slotsInDay) {
                high -= slotsInDay;
                range = {
                    'normal': [low, slotsInDay],
                    'late': [0, high]
                };
            } else {
                range = { 'normal': slotRangeRaw };
            }

            // range = timeRangeCrosses === undefined ?
            //     [slotRangeRaw] : [[low, slotsInDay], [0, high]];

            // if (timeRangeCrosses === undefined) range.push(slotRangeRaw)
            // else range.push([start, slotsInDay], [0, end])

            return range;
        }();

        const oddRange = Object.keys(slotRanges)
            .find(type => type !== 'normal');

        flat.forEach(block => {
            let overlap = [],
                start = block.start,
                end = block.end;
            const [lowRaw, highRaw] = slotRangeRaw;

            Object.entries(slotRanges).forEach(([type, [low, high]]) => {
                // overlap[type] = (start < high && end > low) ? true : false;

                if (start < high && end > low) { // overlap detected
                    overlap.push(type);
                } // else { // no overlap }
            });
            console.log(overlap);

            const odd = overlap.find(type => type !== 'normal');

            if (!overlap.length) return; // no overlap breaks the loop
            else if (overlap.length === 2) { // rare case where block overlaps both ranges
                //     if (oddRange === 'early') // probably doesnt need altering
                //     start += slotsInDay;
                //     end += slotsInDay;
            } else { // just one range overlaps
                if (overlap[0] === 'early') {
                    start -= slotsInDay;
                    end -= slotsInDay;
                    if (start < lowRaw) start = lowRaw;
                } else if (overlap[0] === 'late') {
                    start += slotsInDay;
                    end += slotsInDay;
                    if (end > highRaw) end = highRaw;
                } else {
                    if (start < lowRaw) start = lowRaw;
                    if (end > highRaw) end = highRaw;
                }
            }
            // console.log({ start, end });
            block.start = start;
            block.end = end;
            dataSection.push(block);
        });
   
        flat = dataSection;
        nested = nestify(flat);

        return {
            timeRangeRaw,
            timeRangeCrosses,
            slotRangeRaw,
            oddRange,
            slotRanges,
            dataSection,
        }
    };


    function updateBlocks() { //@note blocks
        BLOCKSET.updateBlocks();
        flat = BLOCKSET.blocks;
        nested = nestify(flat);
        columns = Array.from({ length: GS.GRIDS.length }, (_, i) => i);
        populated = [...new Set(flat.map(d => d.layer))]; // Set to get unique
        // console.log({flat, nested});
        if (dialRange === 'half') dataSectioner()
        console.log(flat);
    }

    function nestify(blocks) {
        return Array.from(d3.group(blocks, d => d.layer),
            ([key, value]) => ({ key, value }))
    }

    function getTime() { // @note time
        // const timeNow = new Date();
        // const timeNow = dialDirection === 'fixed' ? $('#fixedTime').val() : new Date();
        const thisTime = new Date();
        if (dialDirection === 'fixed') {
            const fixedTime = $('#fixedTime').val().split(':');
            thisTime.setHours(fixedTime[0], fixedTime[1]);
        }
        const thisHour = thisTime.getHours();
        const thisMinute = thisTime.getMinutes();
        const minutes = thisHour * 60 + thisMinute;
        const closestFullHour = Math.round(minutes / 60);

        const range = dialRange === 'full' ?
            [0, 24] : [closestFullHour - 6, closestFullHour + 6];

        function padZero(number) {
            return `${number}`.padStart(2, '0');
        }

        return {
            extended: `${padZero(thisHour)}:${padZero(thisMinute)}`, // 00:00
            minutes, // integer
            closestFullHour, // integer
            range // domain [start, end]
            // slots: Math.round(minutes/minutesInSlot) * minutesInSlot // func?
        }
    }


    ////////// Range mappers ////////// @note remappers
    // similar remapper functions could be refactored with factory 
    // function remapFactory(a, b, c, d) {
    //     let fromLow, fromHigh, toLow, toHigh;
    //     if (arguments.length === 2) {
    //         fromLow = 0,
    //         fromHigh = a,
    //         toLow = 0,
    //         toHigh = b;
    //     } else if (arguments.length === 4) {
    //         fromLow = a,
    //         fromHigh = b,
    //         toLow = c,
    //         toHigh = d;
    //     } else {
    //         throw new Error("Invalid number of arguments");
    //     }
    //
    //     const remapper = d3.scaleLinear()
    //         .domain([fromLow, fromHigh]) // slots domain
    //         .range([toLow, toHigh]); // angle range in radians
    //     return (value) => remapper(value);
    // }
    //
    // const hoursToRadians = remapFactory(hoursInDay, TAU);
    // hoursToRadians(4);
    //////////////////////////

    const slotsToRadians = (slot) => {
        const scale = d3.scaleLinear()
            .domain([0, maxSlots]) // slots domain
            .range([0, TAU]); // angle range in radians
        return scale(slot);
    };
    /* 
    const slotsToDegrees = d3.scaleLinear()
        .domain([0, maxSlots]) // slots domain
        .range([0, degreesInTurn]); // angle range in degrees
    */
    const minutesToDegrees = (minutes) => {
        const scale = d3.scaleLinear()
            .domain([0, pixelsInSlot * slotsPerHour * timescale]) // minutes domain [0, pixelsInSlot * slotsInDay]
            .range([0, degreesInTurn]); // angle range in degrees
        return scale(minutes);
    };


    ///////// MARKS ///////////// @note markset
    const dialMarks = () => {
        const timeRange = getTime().range;
        const rawNumbers = d3.range(...timeRange);
        console.log({ rawNumbers });
        const numerals = rawNumbers // arr.slice(-2)
            .map(numeral => {
                //     numeral <= 0 ? numeral + hoursInDay : numeral % hoursInDay
                // ); // this would work but: 24 % 24 = 0
                if (numeral < 1) {
                    numeral += hoursInDay;
                } else if (numeral > 24) {
                    numeral -= hoursInDay;
                }
                return numeral;
            });
        const sectorAngle = TAU / timescale;

        const hoursToRadians = d3.scaleLinear()
            .domain([0 + 1, timescale + 1])
            .range([0, TAU]);

        const startAngles = rawNumbers.map(hoursToRadians);
        const endAngles = startAngles.map(angle => angle + sectorAngle);

        const greys =
            ['rgb(var(--rgb-coolgrey-7) / var(--opacity-4))',
            'rgb(var(--rgb-coolgrey-3) / var(--opacity-9))'];
        const fills = Array.from(numerals, num => greys[num % 2]);

        // dialMarks object from arrays
        return d3.zip(numerals, startAngles, endAngles, fills)
            .map(d => ({
                numeral: d[0],
                startAngle: d[1],
                endAngle: d[2],
                fill: d[3]
            }));

        //////////// shorthand
        // const keys = ['numeral', 'startAngle', 'endAngle', 'fill'];
        // const obj = d3.zip(...[start, end, foo, bar]).map(d =>
        //     Object.fromEntries(keys.map((k, i) => [k, d[i]]))
        // );
        //////////// UBER concise ////////////
        // const arrays = {
        //     numeral,
        //     startAngle,
        //     endAngle,
        //     fill
        //   };
        //   const keys = Object.keys(arrays);
        //   const obj = d3.zip(...keys.map(k => arrays[k]))
        //     .map(d => Object.fromEntries(keys.map(
        //         (k, i) => [k, d[i]]
        //     )));
        ////////////////////////////////////
    };


    // Drawing a chart @note containers

    // nested SVG - centered coords system
    const clockface = d3.select('#⭕clockface');

    /////////// Definitions ///////////
    const definitions = clockface.select('defs');
    // const definitions = clockface.append('g')
    //     .classed('arc-curves', true);

    /////////// Dial ///////////
    const dialContainer = clockface.append('g')
        .attr('id', '⭕dial');
    const base = dialContainer.append('g')
        .attr('id', '⭕base');
    const marks = dialContainer.append('g')
        .attr('id', '⭕marks');
    const hours = dialContainer.append('g')
        .attr('id', '⭕hours');

    clockface.append('use')
        .attr('href', '#⭕timeIndicator');

    ///////////  Donuts  ///////////
    const donutsContainer = clockface.append('g')
        .attr('id', '⭕donuts');

    /////////// Arches ///////////
    const archesContainer = clockface.append('g')
        .attr('id', '⭕arches');

    ///////////// Legend ///////////
    const labelsContainer = clockface.append('g')
        .attr('id', '⭕labels');

    ///////////// Cover ///////////
    const cover = clockface.append('g')
        .attr('id', '⭕cover');
    const focus = cover.append('g')
        .attr('id', '⭕focus');
    const hover = cover.append('g')
        .attr('id', '⭕hover');
    const horizonContainer = cover.append('g')
        .attr('id', '⭕horizon');
    const horizon = horizonContainer.append('foreignObject')
        .attr('x', '-100')
        .attr('y', '-100')
        .attr('width', '200')
        .attr('height', '200')
        .append('xhtml:div');
        // .append('div')
        // .attr('xmlns', 'http://www.w3.org/1999/xhtml');


    ///////////// Init & update ///////////
    function initialize() {
        updateSettings();
        /* 
        dialRange = $('#dialRange > label.active input')
            .attr('id').split('Day')[0];
        dialDirection = $('#dialDirection > .active input')
            .attr('id').split('Dir')[0];
        // fixedTimeSlots = $('#fixedTime').data('slots');
        // nowTimeSlots = Math.round(timeToSlot(getTime()));
        firstPie = $('#firstPie').hasClass('active');
        */
        dialDirection === 'fixed' ? $('#time-Fixed').show() : $('#time-Fixed').hide();

        ///////// Clockface /////////
        base.append('circle')
            .attr('r', 100)
            .attr('fill', 'var(--color-primary)');
        // base.append('circle')
        //     .attr('r', 100)
        //     .attr('fill', 'rgb(var(--rgb-coolgrey-1) / var(--opacity-5))');
    }

    function updater(caller) { // @audit-ok updater
        console.groupCollapsed('Chart update sequence');
        console.log(caller);
        console.trace();

        updateSettings();
        updateBlocks();
        renderDial();
        renderClockChart();
        updateRevolution();

        console.groupEnd();
    }

    initialize();
    updater('First run');


    /////// Transitions helpers ///////
    // TODO: create transition constants storage object
    // const rotationTransition = d3.transition()
    //     .duration(1000)
    //     .ease(d3.easeSinOut);
    // function rotationInterpolator(angle) {
    //     console.log(this);
    //     const startRotation = this.getAttribute('transform') || 'rotate(0)';
    //     const endRotation = `rotate(${angle})`;
    //     return d3.interpolateString(startRotation, endRotation)
    // }
    // @note transitions
/*     function rotationTween(selector, angle) {
        const element = d3.select(selector);
        console.log(element);
        const startRotation = element.node().getAttribute('transform') || 'rotate(0)';
        const endRotation = `rotate(${angle})`;

        const rotationTween = d3.interpolateString(startRotation, endRotation)

        return element.transition()
            .duration(1000)
            .ease(d3.easeSinOut)
            .attrTween('transform', () => rotationTween);
    } // rotationTween('#⭕chart', -degrees);
 */
    // TODO: create transition factory
    function transitionRotation(selection, targetAngle) {
        // TODO: interpolate numbers instead of strings for performance (?)
        const targetRotation = `rotate(${targetAngle})`;

        selection.transition()
            .duration(1000)
            .ease(d3.easeSinOut)
            .attrTween('transform', function () {
                const currentRotation = this.getAttribute('transform') || 'rotate(0)';
                // console.log({currentRotation,targetRotation});
                return d3.interpolateString(currentRotation, targetRotation);
            });
    } // d3.select('#⭕chart').call(transitionRotation, -degrees);


    //////////// Chart rotation ///////////
    function startRevolution() { // rect1, rect2, degreesPerMinute
        if (typeof revolutionInterval === 'undefined') {
            revolutionInterval = setInterval(() => {
                updateRevolution(); // rect1, rect2, degreesPerMinute / 60
            }, 60000); // 60000 ms = 1 min
        }
        // updateRevolution();
    }

    function stopRevolution() {
        if (typeof revolutionInterval !== 'undefined') {
            clearInterval(revolutionInterval);
            revolutionInterval = undefined;
        }
    }

    function updateRevolution() { // rect1, rect2, degreesPerSecond
        const timeMinutes = getTime().minutes;
        const degreesFromMinutes = minutesToDegrees(timeMinutes);
        // console.warn(degreesFromMinutes);

        /// long version
        let chartAngle;
        switch (dialDirection) {
            case 'noon':
                startRevolution()
                chartAngle = 0;
                break;
            case 'now':
                startRevolution()
                chartAngle = degreesFromMinutes;
                break;
            case 'fixed':
                stopRevolution()
                chartAngle = degreesFromMinutes;
                break;
            default:
                break;
        }
        /// shorthand
        // const chartAngle = dialDirection === 'noon' ? 0 : degreesFromMinutes;
        // dialDirection === 'fixed' ? stopRevolution() : startRevolution();
        ////////////////////////

        updateTimeIndicators(timeMinutes);
        rotateChart(chartAngle);
        console.info('revolution: %o', { timeMinutes, chartAngle });
    }

    function rotateChart(degrees) {
        // TODO: modify rotation angle so its never bigger than 180
        console.log(`chart rotation: ${degrees}deg`);

        // clockface - no parent = it's center is pivot
        d3.select('#⭕chart').call(transitionRotation, -degrees);

        // hour marks - parent 'g's center is pivot
        hours.selectAll('text').each(function () {
            d3.select(this).call(transitionRotation, degrees);
        });
    }

    function updateTimeIndicators(minutes) {
        let timeIndicatorY = minutes * pixelsPerMinute;
        // TODO: extract this to mutated 'transitionRotation'
        d3.select('#timeIndicator')
            .transition()
            .duration(1000)
            .ease(d3.easeSinOut)
            .styleTween('transform', function () {
                const currentPosition = this.style.transform || `translate(0px, 0px)`;
                const targetPosition = `translate(0px, ${timeIndicatorY}px)`;
                return d3.interpolateString(currentPosition, targetPosition);
            });

        let timeIndicatorAngle = minutesToDegrees(minutes) // minutes / (pixelsInSlot * slotsInDay) * 360;
        // $('#⭕clockface line').attr('transform', `rotate(${timeIndicatorAngle})`);
        d3.select('#⭕timeIndicator').call(transitionRotation, timeIndicatorAngle);

        const hoursToDegrees = d3.scaleLinear()
            .domain([0, timescale])
            .range([0, degreesInTurn]);
        const horizonAngle =
            hoursToDegrees(getTime().closestFullHour) + degreesInTurn / 2;
        // horizonAngle could be extracted from dialMarks()[0].startAngle
        // after conversion from radians to degrees
        horizonContainer.call(transitionRotation, horizonAngle);
    }


    // Update clock chart dial @note render
    function renderDial() {
        ///////// MARKS /////////
        const marksR = 92; // FIXME: magic number
        const marksGen = d3.arc()
        .innerRadius(5)
        .outerRadius(100)
        .startAngle(d => d.startAngle)
        .endAngle(d => d.endAngle);

        marks.selectAll('path')
            .data(dialMarks()) //, d => d)
            .join('path')
            .attr('fill', d => d.fill)
            .attr('d', marksGen);
        // console.log(dialMarks());
        // console.log(marks.select('path').datum());

        ///////// HOURS /////////
        const hourGroupsUpdate = hours.selectAll('g')
            .data(dialMarks());
        const hourGroupsEnter = hourGroupsUpdate.enter().append('g');
        const hourGroups = hourGroupsEnter.merge(hourGroupsUpdate);
        hourGroupsUpdate.exit().remove();

        hourGroups.attr('transform', d => {
            const x = marksR * Math.sin(d.endAngle);
            const y = -marksR * Math.cos(d.endAngle);
            return `translate(${x} ${y})`
        });

        hourGroupsEnter.append('text')
            .merge(hourGroupsUpdate.select('text'))
            .text(d => d.numeral);
        // .attr('text-anchor', 'middle')
        // .attr('dominant-baseline', 'middle');

        ///////// HORIZON /////////
        // if (dialRange === 'half') // timescale is better for transitions (?)
        if (timescale < 24) {
            horizon.style('opacity', 1);
        } else if (timescale === 24) {
            horizon.style('opacity', 0);
        }
    }

    // Update clock chart rings & arches
    function renderClockChart() {
        ////////// Data ///////////////
        // TODO: create chart data object for slicing (24h/12h) and nesting
        updateBlocks();

        ///////////  Donuts  ///////////
        const ringWidth = d3.scaleBand()
            .domain(columns)
            .range([85, 15])
            .paddingInner(0.25)
            .paddingOuter(0)
            .align(1);

        const donutGen = d3.arc()
            .innerRadius(d => ringWidth(d))
            .outerRadius(d => ringWidth(d) + ringWidth.bandwidth())
            .startAngle(0)
            .endAngle(TAU);

        const donutsUpdate = donutsContainer.selectAll('path')
            .data(populated, d => d);
        const donutsEnter = donutsUpdate.enter().append('path');
        const donuts = donutsEnter.merge(donutsUpdate);
        donutsUpdate.exit().remove();

        donuts//.classed(d => '⭕ring' + d, true)  
            .attr('d', donutGen)
            .attr('fill', 'rgb(var(--rgb-coolgrey-1) / var(--opacity-5))');

        ///////////  Rings  //////////////
        const archGen = d3.arc()
            .innerRadius(d => ringWidth(d.layer))
            .outerRadius(d => ringWidth(d.layer) + ringWidth.bandwidth())
            .startAngle(d => slotsToRadians(d.start))
            .endAngle(d => slotsToRadians(d.end))
            .cornerRadius(2);

        const ringGroupsUpdate = archesContainer.selectChildren('g')
            .data(nested, d => d.key);
        const ringGroupsEnter = ringGroupsUpdate.enter()
            .append('g');
        const ringGroups = ringGroupsEnter.merge(ringGroupsUpdate);
        ringGroupsUpdate.exit()
            .remove();

        ringGroups.attr('id', d => '⭕ring' + d.key) // d

        const archesUpdate = ringGroups.selectAll('path')
            .data(d => d.value, d => d.id)
        const archesEnter = archesUpdate.enter().append('path');
        const arches = archesEnter.merge(archesUpdate);
        archesUpdate.exit().remove();

        arches
            .attr('fill', d => d.color)
            .attr('d', archGen);

        ///////////// Legend //////////////
        const arcPathGen = d => {
            const path = d3.path(),
                radius = ringWidth(d.layer) + ringWidth.bandwidth() / 2,
                start = slotsToRadians(d.start) - Math.PI / 2,
                end = slotsToRadians(d.end) - Math.PI / 2;
            path.arc(0, 0, radius, start, end);
            return path;
        };

        // legend arcs
        definitions.selectAll('path')
            .data(flat)
            .join('path') // join works fine in simple update
            .attr('id', d => "⭕" + d.id)
            .attr('d', arcPathGen);

        // legend labels
        const labelsUpdate = labelsContainer.selectAll('text')
            .data(flat); // d => d.id
        const labelsEnter = labelsUpdate.enter().append('text')
        const labels = labelsEnter.merge(labelsUpdate);
        labelsUpdate.exit()
            .remove();

        labels.attr('dy', 3);

        labelsEnter.append('textPath')
            .merge(labelsUpdate.select('textPath'))
            .attr('startOffset', 2)
            .attr('href', d => '#⭕' + d.id) // 'xlink:href'
            .text(d => d.name);


        console.log('Clock chart updated')
    }

    
    return { // @note return
        set flat(value) { flat = value },
        get flat() { return flat },
        get nested() { return nested },
        //set nested(value) { nested = value },
        // get columns() { return columns },
        // get populated() { return populated },
        dataSectioner,
        slotsToRadians,
        updater,
        updateRevolution,
        updateSettings,
        get timescale() { return timescale },
        dialMarks, //
        // ringWidth, //
        rotateChart, //
        renderDial, //
        renderClockChart, //
        getTime //
    }
})();
