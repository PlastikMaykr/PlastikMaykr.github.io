// Temp data for structural analysis
const GsPlaceholder = [
    [
        {
            "x": 0,
            "y": 8,
            "h": 4,
            "minH": minSlots,
            "id": "IVZD",
            "content": "<p data-color=\"purple\">Time</p>"
        },
        {
            "x": 0,
            "y": 14,
            "h": 8,
            "minH": minSlots,
            "id": "BLOM",
            "content": "<p data-color=\"teal\">Yoloblomo</p>"
        }
    ], [
        {
            "x": 0,
            "y": 24,
            "h": 12,
            "minH": minSlots,
            "id": "NBIU",
            "content": "<p data-color=\"green\">Place</p>"
        },
        {
            "x": 0,
            "y": 40,
            "h": 2,
            "minH": minSlots,
            "id": "CORE",
            "content": "<p data-color=\"red\">Hard</p>"
        }
    ]
];

/* const SerialPlaceholder = [
    {
        "id": "IVZD",
        "name": "Time",
        "color": "purple",
        "start": 8,
        "dur": 4,
        "end": 12,
        "layer": 0
    },
    {
        "id": "BLOM",
        "name": "Yoloblomo",
        "color": "teal",
        "start": 14,
        "dur": 8,
        "end": 22,
        "layer": 0
    },
    {
        "id": "NBIU",
        "name": "Place",
        "color": "green",
        "start": 24,
        "dur": 12,
        "end": 36,
        "layer": 1
    },
    {
        "id": "CORE",
        "name": "Hard",
        "color": "red",
        "start": 40,
        "dur": 2,
        "end": 42,
        "layer": 1
    }
]; */


const SerialPlaceholder = [{"id":"IVZD","name":"Commute","color":"purple","start":20,"dur":4,"end":24,"layer":0},{"id":"BLOM","name":"Work","color":"teal","start":24,"dur":8,"end":32,"layer":0},{"id":"NBIU","name":"Meeting","color":"green","start":28,"dur":12,"end":40,"layer":1},{"id":"CORE","name":"Break","color":"red","start":40,"dur":2,"end":42,"layer":1}];




const BLOCKSET = (function () {
    let blocks = SerialPlaceholder; // loadStorage() || SerialPlaceholder
    // let nested = nestify(blocks); // BLOCKSET.nest(SerialPlaceholder),

    loadStorage();
    /////////////

    function updateBlocks() {
        blocks = GS.readCalendar();
        // nested = nestify(blocks);
        // console.log({flat, nested});
    }

    function saveStorage() {
        updateBlocks();
        localStorage.setItem('blocks', JSON.stringify(blocks));
        console.warn('BLOCKSET has been saved to session storage!')
    }
    function loadStorage() {
        const storageBlocks = localStorage.getItem('blocks');
        let content;
        if (storageBlocks) {
            console.warn('BLOCKSET has been loaded from session storage!');

            content = JSON.parse(storageBlocks);
            blocks = content;
            // nested = nestify(blocks);
            if (typeof GS !== 'undefined') GS.overwriteCalendar();
            return content
        } else {
            console.warn('No BLOCKSET in session storage!');
            return false
        }
    }
    function resetStorage() {
        console.warn('BLOCKSET deleted from session storage!');
        localStorage.clear();
    }

    function saveJSON() {
        updateBlocks()
        let file = JSON.stringify(blocks);
        saveButton = $('#saveFile');
        saveButton.attr('href',
            window.URL.createObjectURL(
                new Blob([file], { type: "text/plain" })
            )
        );
        saveButton.attr('download', 'blocks.json')
    }
    function loadJSON() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = () => {
                const content = reader.result;
                console.log('Selected file contents:', content);
                blocks = JSON.parse(content);
                // nested = nestify(blocks);
            };
            reader.onloadend = () => {
                // console.log('onloaded');
                if (typeof GS !== 'undefined') GS.overwriteCalendar();
                // return content
            };
            reader.readAsText(file);
        });
        fileInput.click();
        ////////////////////////////
        // console.log({content});
        // return content
    }

    // function nestify(blocks) {
    //     return Array.from(d3.group(blocks, d => d.layer),
    //         ([key, value]) => ({ key, value }))
    // }

    return {
        get blocks() { return blocks },
        set blocks(value) { blocks = value },
        // get nested() { return nested },
        // set nested(value) { nested = value },
        updateBlocks,
        saveStorage,
        loadStorage,
        resetStorage,
        saveJSON,
        loadJSON
    }
})();


const BEEP = {
    day: 'today',
    now: 0,
    getNow: () => {
        BEEP.now = Date.now()
    }
};


// { "x": 0, "y": 40, "h": 2, "minH": minSlots, "id": "CORE", "content": "<p data-color=\"red\">Hard</p>" }

// { "id": "NUDF", "name": "Mind, body, spirit", "color": "purple", "start": 9, "dur": 8, "end": 17, "layer": 0 }
