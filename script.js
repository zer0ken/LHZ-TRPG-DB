function tsvToJSON(tsv_string){
    const rows = tsv_string.split("\r\n");
    const jsonArray = [];
    const header = rows[0].split("\t");
    for(let i = 1; i < rows.length; i++){
        let obj = {};
        let row = rows[i].split("\t");
        for(let j=0; j < header.length; j++){
            obj[header[j]] = row[j];
        }
        jsonArray.push(obj);
  
    }
    return jsonArray;
}

let db;

window.onload = function () {
    $("#file_uploads").on("change", fetchDB);
    $("#skills").on("scroll", onSkillScroll);
}

function fetchDB() {
    const file = $("#file_uploads").prop("files")[0];
    const fileReader = new FileReader();
    fileReader.onload = () => {
        db = tsvToJSON(fileReader.result);
        onDBLoaded();
    }
    fileReader.readAsText(file);

    // fetch("db.tsv")
    //     .then(response => response.text())
    //     .then(text => {
    //         db = tsvToJSON(text);
    //         onDBLoaded();
        // });
}

function onDBLoaded() {
    preprocess();
    initHierarchy();

    // add skills to the div#skills
    const $skillsDiv = $("#skills");
    const $fragment = buildFragment();

    $skillsDiv.append($fragment);
    initNavMenu();
}

function onSkillScroll() {
    //filter the .category element which is over the scrolled position
    const currentCategory = $(".label").filter(function () {
        return $(this).position().top < 0;
    });
    let hierarchy = []
    for (let i = 0; i < currentCategory.length; i++) {
        const label = currentCategory[i];
        const depth = parseInt(label.tagName.toLowerCase()[1]) - 1;
        if (hierarchy.length < depth + 1) {
            hierarchy.push(undefined);
        }
        hierarchy[depth] = label;
        if (hierarchy.length > depth + 1) {
            hierarchy = hierarchy.slice(0, depth + 1);
        }
    }
    $("#nav>.scroll").remove();
    for (let i = 0; i < hierarchy.length; i++) {
        $("#nav").append($(`<a class="scroll" href="#${hierarchy[i].id}">`).text(hierarchy[i].innerText));
        if (i < hierarchy.length - 1) $("#nav").append(`<span class="scroll">&nbsp;/&nbsp;</span>`);
    }
}

function preprocess() {
    let toRemove = [];

    for (let i = 0; i < db.length; i++) {
        let row = db[i];
        if (row["구분"] === "EX 파워") {
            for (let key in skillToEX) {
                row[skillToEX[key]] = row[key];
                delete row[key];
            }
        }
        else if (row["구분"] === "프롭") {
            for (let key in skillToProps) {
                row[skillToProps[key]] = row[key];
                delete row[key];
            }
        }
        
        if (row["구분"] === "EX 파워" || row["구분"] === "프롭") {
            for (let parent of row["출처"].split(",")) {
                parent = parent.substring(1, parent.length - 1);
                parent = db.find((row) => row["이름"] === parent);
                if (!parent) continue;

                if (!parent["하위 데이터"]) {
                    parent["하위 데이터"] = [];
                }
                parent["하위 데이터"].push(row);
                toRemove.push(i);
            }
        }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
        db.splice(toRemove[i], 1);
    }
}

function initHierarchy() {
    for (let i = 0; i < db.length; i++) {
        let row = db[i];
        
        if (row["분야"] === "아키") {
            row["카테고리"] = ["직업 특기", row["조건"], row["구분"]];
        }
        else if (row["분야"] === "메인") {
            for (let aki of Object.keys(hierarchy["직업 특기"])) {
                if (hierarchy["직업 특기"][aki].includes(row["조건"])) {
                    row["카테고리"] = ["직업 특기", aki, row["조건"], row["구분"]];
                    break;
                }
            }
        } else if (row["분야"] === "종족") {
            row["카테고리"] = ["종족 특기", row["조건"], row["구분"]];
        } else {
            row["카테고리"] = ["공통 특기", row["구분"]];
        }
        for (let i = 0; i < row["카테고리"].length; i++) {
            row["카테고리"][i] = row["카테고리"][i][0] === "〈" ? row["카테고리"][i].substring(1, row["카테고리"][i].length - 1) : row["카테고리"][i];
        }
    }
}

function buildFragment() {
    const $fragment = $(document.createDocumentFragment());

    for (let row of db) {
        const rawCategory = row["카테고리"];
        const category = row["카테고리"].map((cat) => cat.replace(/ /g, "_"));

        let $container = $fragment;
        for (let i = 0; i < category.length; i++) {
            let $nextContainer = $container.find(`#${category[i]}`);
            if ($nextContainer.length === 0) {
                $nextContainer = $(`<div id="${category[i]}" class="category ${category[i]}"></div>`).appendTo($container);
                $(`<h${i+1} id="__${category.slice(0, i + 1).join("_")}" class="label">${rawCategory[i]}</h${i+1}>`).appendTo($nextContainer);
            }
            $container = $nextContainer;
        }
        $container.append(buildSkillTable(row));
    }

    return $fragment;
}

function buildSkillTable(skill) {
    const $fragment = $(document.createDocumentFragment()); 
    let $skill = $(`<table class="skill">`).appendTo($fragment);
    let $row;

    $row = $(`<tr class="name ${skill["구분"]}">`).appendTo($skill);
    $row.append($(`<th class="skil_name" colspan="4">`).text(skill["이름"]));

    $row = $(`<tr class="tag">`).appendTo($skill);
    $row.append($(`<th>`).text("태그"));
    $row.append($(`<td colspan="3">`).text(skill["태그"]));

    $row = $(`<tr class="detail">`).appendTo($skill);
    $row.append($(`<th>`).text("타이밍"));
    $row.append($(`<td>`).text(skill["타이밍"]));
    $row.append($(`<th>`).text("최대SR"));
    $row.append($(`<td>`).text(skill["최대SR"]));

    $row = $(`<tr class="detail">`).appendTo($skill);
    $row.append($(`<th>`).text("제한"));
    $row.append($(`<td>`).text(skill["제한"]));
    $row.append($(`<th>`).text("코스트"));
    $row.append($(`<td>`).text(skill["코스트"]));

    $row = $(`<tr class="detail">`).appendTo($skill);
    $row.append($(`<th>`).text("대상"));
    $row.append($(`<td>`).text(skill["대상"]));
    $row.append($(`<th>`).text("사정거리"));
    $row.append($(`<td>`).text(skill["사정거리"]));

    $row = $(`<tr class="effect">`).appendTo($skill);
    $row.append($(`<td colspan="4">`).text(skill["효과"]));

    return $fragment;
}

function initNavMenu() {
    const $navMenu = $("#nav_menu");
    const $labels = $(".label").filter(function () {
        return $(this).text() !== "전투" && $(this).text() !== "일반";
    });
    for (let i = 0; i < $labels.length; i++) {
        const $label = $($labels[i]);
        const $anchor = $(`<li class="dropdown"><a href="#${$label.attr("id")}">${$label.text()}</a></li>`).appendTo($navMenu);
    }
}

const skillToEX = { "조건": "출처" };
const skillToProps = { "타이밍": "해석 난이도", "판정": "해제 난이도", "코스트": "탐지 난이도", "조건": "출처" };
const hierarchy = {
    "직업 특기": {
        "〈전사직〉": ["〈가디언〉", "〈사무라이〉", "〈몽크〉"],
        "〈회복직〉": ["〈클레릭〉", "〈칸나기〉", "〈드루이드〉"],
        "〈무기공격직〉": ["〈어새신〉", "〈스워시버클러〉", "〈바드〉"],
        "〈마법공격직〉": ["〈서머너〉", "〈소서러〉", "〈인챈터〉"],
    },
    "종족 특기": [
        "〈휴먼〉", "〈엘프〉", "〈드워프〉", "〈하프알브〉",
        "〈묘인족〉", "〈낭아족〉", "〈호미족〉", "〈법의족〉"
    ]
};