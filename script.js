"use strict";

/* =========================================
   기본 상수
========================================= */

const BAR_CONVERSION = 100000;
const GRAVITY = 9.81;


/* =========================================
   관 종류별 내경 데이터
   단위: mm
========================================= */

const PIPE_DATABASE = {
    "sus-tube": {
        '1/4"': 4.75,
        '3/8"': 7.745,
        '1/2"': 10.22,
        '3/4"': 15.75,
        '1"': 22.1,
        '1-1/4"': 28.45,
        '1-1/2"': 34.8
    },

    "flexible-a": {
        '1/4"': 6.1,
        '3/8"': 10.37,
        '1/2"': 13.86,
        '3/4"': 20.67,
        '1"': 27.1,
        '1-1/4"': 33,
        '1-1/2"': 39
    },

    "flexible-b": {
        '1/4"': 8.5,
        '3/8"': 10,
        '1/2"': 12,
        '3/4"': 16,
        '1"': 21.5,
        '1-1/4"': 28
    }
};


/* =========================================
   행 번호 및 계산 결과 저장 변수
========================================= */

let pipeRowCounter = 0;
let localRowCounter = 0;

let latestPipeTotal = 0;
let latestLocalTotal = 0;
let latestElevationTotal = 0;


/* =========================================
   HTML 요소 불러오기
========================================= */

const pipeTypeSelect =
    document.getElementById("pipeType");

const pipeSizeSelect =
    document.getElementById("pipeSize");

const flowRateInput =
    document.getElementById("flowRate");

const areaResult =
    document.getElementById("areaResult");

const velocityResult =
    document.getElementById("velocityResult");

const pipeRows =
    document.getElementById("pipeRows");

const localRows =
    document.getElementById("localRows");

const pipeTotalElement =
    document.getElementById("pipeTotal");

const localTotalElement =
    document.getElementById("localTotal");

const elevationDensityInput =
    document.getElementById("elevationDensity");

const heightDifferenceInput =
    document.getElementById("heightDifference");

const elevationResultElement =
    document.getElementById("elevationResult");

const summaryPipeElement =
    document.getElementById("summaryPipe");

const summaryLocalElement =
    document.getElementById("summaryLocal");

const summaryElevationElement =
    document.getElementById("summaryElevation");

const grandTotalElement =
    document.getElementById("grandTotal");

const addPipeRowButton =
    document.getElementById("addPipeRow");

const addLocalRowButton =
    document.getElementById("addLocalRow");

const resetAllButton =
    document.getElementById("resetAll");


/* =========================================
   공통 함수
========================================= */

function getNumber(value) {
    const number = Number.parseFloat(value);

    if (Number.isFinite(number)) {
        return number;
    }

    return 0;
}


function formatNumber(value, decimalPlaces = 2) {
    if (!Number.isFinite(value)) {
        return "-";
    }

    return value.toFixed(decimalPlaces);
}


function escapeAttribute(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}


/* =========================================
   호칭경 선택 목록 생성
========================================= */

function updatePipeSizes() {
    const selectedType =
        pipeTypeSelect.value;

    const pipeSizes =
        PIPE_DATABASE[selectedType];

    pipeSizeSelect.innerHTML = "";

    if (!pipeSizes) {
        const errorOption =
            document.createElement("option");

        errorOption.value = "";
        errorOption.textContent =
            "호칭경 데이터를 불러올 수 없습니다.";

        pipeSizeSelect.appendChild(errorOption);

        areaResult.textContent = "-";
        velocityResult.textContent = "-";

        console.error(
            "관 종류 데이터가 없습니다:",
            selectedType
        );

        return;
    }

    Object.entries(pipeSizes).forEach(
        ([nominalSize, innerDiameter]) => {
            const option =
                document.createElement("option");

            option.value =
                nominalSize;

            option.textContent =
                `${nominalSize} (내경 ${innerDiameter} mm)`;

            pipeSizeSelect.appendChild(option);
        }
    );

    calculateVelocity();
}


/* =========================================
   유속 계산
========================================= */

function calculateVelocity() {
    const flowRateLpm =
        getNumber(flowRateInput.value);

    const selectedType =
        pipeTypeSelect.value;

    const selectedSize =
        pipeSizeSelect.value;

    const diameterMm =
        PIPE_DATABASE[selectedType]?.[selectedSize] ?? 0;

    if (
        flowRateLpm <= 0 ||
        diameterMm <= 0
    ) {
        areaResult.textContent = "-";
        velocityResult.textContent = "-";

        return;
    }

    const flowRateCubicMeterPerSecond =
        flowRateLpm / 1000 / 60;

    const diameterMeter =
        diameterMm / 1000;

    const area =
        Math.PI *
        Math.pow(diameterMeter, 2) /
        4;

    const velocity =
        flowRateCubicMeterPerSecond /
        area;

    areaResult.textContent =
        formatNumber(area, 9);

    velocityResult.textContent =
        formatNumber(velocity, 2);
}


/* =========================================
   마찰계수 계산
========================================= */

function calculateFrictionFactor(
    reynoldsNumber,
    roughnessMeter,
    diameterMeter
) {
    if (
        reynoldsNumber <= 0 ||
        diameterMeter <= 0
    ) {
        return {
            frictionFactor: 0,
            flowRegime: "-"
        };
    }

    if (reynoldsNumber < 2300) {
        return {
            frictionFactor:
                64 / reynoldsNumber,

            flowRegime:
                "층류"
        };
    }

    const relativeRoughness =
        Math.max(roughnessMeter, 0) /
        diameterMeter;

    const logarithmTerm =
        relativeRoughness / 3.7 +
        5.74 /
        Math.pow(reynoldsNumber, 0.9);

    if (logarithmTerm <= 0) {
        return {
            frictionFactor: 0,
            flowRegime: "-"
        };
    }

    const frictionFactor =
        0.25 /
        Math.pow(
            Math.log10(logarithmTerm),
            2
        );

    return {
        frictionFactor,

        flowRegime:
            reynoldsNumber <= 4000
                ? "천이영역"
                : "난류"
    };
}


/* =========================================
   직관 계산 행 생성
========================================= */

function createPipeRow(defaultValues = {}) {
    pipeRowCounter += 1;

    const row =
        document.createElement("tr");

    row.dataset.rowId =
        String(pipeRowCounter);

    row.innerHTML = `
        <td>
            <input
                type="text"
                class="pipe-name"
                placeholder="예: 토출 배관"
                value="${escapeAttribute(
                    defaultValues.name ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="pipe-length"
                min="0"
                step="any"
                placeholder="0"
                value="${escapeAttribute(
                    defaultValues.length ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="pipe-diameter"
                min="0"
                step="any"
                placeholder="0"
                value="${escapeAttribute(
                    defaultValues.diameter ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="pipe-roughness"
                min="0"
                step="any"
                placeholder="0.0015"
                value="${escapeAttribute(
                    defaultValues.roughness ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="pipe-density"
                min="0"
                step="any"
                placeholder="1000"
                value="${escapeAttribute(
                    defaultValues.density ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="pipe-viscosity"
                min="0"
                step="any"
                placeholder="0.001"
                value="${escapeAttribute(
                    defaultValues.viscosity ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="pipe-velocity"
                min="0"
                step="any"
                placeholder="0"
                value="${escapeAttribute(
                    defaultValues.velocity ?? ""
                )}"
            >
        </td>

        <td class="readonly-cell">
            <span class="reynolds-result">
                0
            </span>

            <span class="flow-regime">
                -
            </span>
        </td>

        <td class="readonly-cell">
            <span class="friction-result">
                0.000000
            </span>
        </td>

        <td class="readonly-cell">
            <span class="pipe-loss-result">
                0.00
            </span>
        </td>

        <td>
            <button
                type="button"
                class="delete-button delete-pipe-row"
                aria-label="직관 행 삭제"
                title="행 삭제"
            >
                ×
            </button>
        </td>
    `;

    pipeRows.appendChild(row);

    row
        .querySelectorAll("input")
        .forEach((input) => {
            input.addEventListener(
                "input",
                calculatePipeLosses
            );
        });

    row
        .querySelector(".delete-pipe-row")
        .addEventListener(
            "click",
            () => {
                row.remove();

                if (
                    pipeRows.children.length === 0
                ) {
                    createPipeRow();
                }

                calculatePipeLosses();
            }
        );

    calculatePipeLosses();
}


/* =========================================
   직관 마찰손실 계산
========================================= */

function calculatePipeLosses() {
    let totalLossBar = 0;

    pipeRows
        .querySelectorAll("tr")
        .forEach((row) => {
            const length =
                getNumber(
                    row.querySelector(
                        ".pipe-length"
                    ).value
                );

            const diameterMm =
                getNumber(
                    row.querySelector(
                        ".pipe-diameter"
                    ).value
                );

            const roughnessMm =
                getNumber(
                    row.querySelector(
                        ".pipe-roughness"
                    ).value
                );

            const density =
                getNumber(
                    row.querySelector(
                        ".pipe-density"
                    ).value
                );

            const viscosity =
                getNumber(
                    row.querySelector(
                        ".pipe-viscosity"
                    ).value
                );

            const velocity =
                getNumber(
                    row.querySelector(
                        ".pipe-velocity"
                    ).value
                );

            const reynoldsResult =
                row.querySelector(
                    ".reynolds-result"
                );

            const flowRegimeResult =
                row.querySelector(
                    ".flow-regime"
                );

            const frictionResult =
                row.querySelector(
                    ".friction-result"
                );

            const lossResult =
                row.querySelector(
                    ".pipe-loss-result"
                );

            const diameterMeter =
                diameterMm / 1000;

            const roughnessMeter =
                roughnessMm / 1000;

            if (
                length <= 0 ||
                diameterMeter <= 0 ||
                density <= 0 ||
                viscosity <= 0 ||
                velocity <= 0
            ) {
                reynoldsResult.textContent =
                    "0";

                flowRegimeResult.textContent =
                    "-";

                frictionResult.textContent =
                    "0.000000";

                lossResult.textContent =
                    "0.00";

                return;
            }

            const reynoldsNumber =
                density *
                velocity *
                diameterMeter /
                viscosity;

            const {
                frictionFactor,
                flowRegime
            } =
                calculateFrictionFactor(
                    reynoldsNumber,
                    roughnessMeter,
                    diameterMeter
                );

            const pressureLossPascal =
                frictionFactor *
                (
                    length /
                    diameterMeter
                ) *
                (
                    density *
                    Math.pow(velocity, 2) /
                    2
                );

            const pressureLossBar =
                pressureLossPascal /
                BAR_CONVERSION;

            reynoldsResult.textContent =
                formatNumber(
                    reynoldsNumber,
                    0
                );

            flowRegimeResult.textContent =
                flowRegime;

            frictionResult.textContent =
                formatNumber(
                    frictionFactor,
                    6
                );

            lossResult.textContent =
                formatNumber(
                    pressureLossBar,
                    2
                );

            totalLossBar +=
                pressureLossBar;
        });

    latestPipeTotal =
        totalLossBar;

    pipeTotalElement.textContent =
        formatNumber(
            totalLossBar,
            2
        );

    updateSummary();
}


/* =========================================
   관부속 계산 행 생성
========================================= */

function createLocalRow(defaultValues = {}) {
    localRowCounter += 1;

    const row =
        document.createElement("tr");

    row.dataset.rowId =
        String(localRowCounter);

    row.innerHTML = `
        <td>
            <input
                type="text"
                class="local-name"
                placeholder="예: 90° 엘보"
                value="${escapeAttribute(
                    defaultValues.name ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="local-quantity"
                min="0"
                step="1"
                placeholder="1"
                value="${escapeAttribute(
                    defaultValues.quantity ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="local-k"
                min="0"
                step="any"
                placeholder="0"
                value="${escapeAttribute(
                    defaultValues.k ?? ""
                )}"
            >
        </td>

        <td class="readonly-cell">
            <span class="local-total-k-result">
                0.000
            </span>
        </td>

        <td>
            <input
                type="number"
                class="local-density"
                min="0"
                step="any"
                placeholder="1000"
                value="${escapeAttribute(
                    defaultValues.density ?? ""
                )}"
            >
        </td>

        <td>
            <input
                type="number"
                class="local-velocity"
                min="0"
                step="any"
                placeholder="0"
                value="${escapeAttribute(
                    defaultValues.velocity ?? ""
                )}"
            >
        </td>

        <td class="readonly-cell">
            <span class="local-loss-result">
                0.00
            </span>
        </td>

        <td>
            <button
                type="button"
                class="delete-button delete-local-row"
                aria-label="관부속 행 삭제"
                title="행 삭제"
            >
                ×
            </button>
        </td>
    `;

    localRows.appendChild(row);

    row
        .querySelectorAll("input")
        .forEach((input) => {
            input.addEventListener(
                "input",
                calculateLocalLosses
            );
        });

    row
        .querySelector(".delete-local-row")
        .addEventListener(
            "click",
            () => {
                row.remove();

                if (
                    localRows.children.length === 0
                ) {
                    createLocalRow();
                }

                calculateLocalLosses();
            }
        );

    calculateLocalLosses();
}


/* =========================================
   관부속 손실 계산
========================================= */

function calculateLocalLosses() {
    let totalLossBar = 0;

    localRows
        .querySelectorAll("tr")
        .forEach((row) => {
            const quantity =
                getNumber(
                    row.querySelector(
                        ".local-quantity"
                    ).value
                );

            const singleK =
                getNumber(
                    row.querySelector(
                        ".local-k"
                    ).value
                );

            const density =
                getNumber(
                    row.querySelector(
                        ".local-density"
                    ).value
                );

            const velocity =
                getNumber(
                    row.querySelector(
                        ".local-velocity"
                    ).value
                );

            const totalKResult =
                row.querySelector(
                    ".local-total-k-result"
                );

            const lossResult =
                row.querySelector(
                    ".local-loss-result"
                );

            const totalK =
                quantity * singleK;

            totalKResult.textContent =
                formatNumber(totalK, 3);

            if (
                quantity <= 0 ||
                singleK < 0 ||
                density <= 0 ||
                velocity <= 0
            ) {
                lossResult.textContent =
                    "0.00";

                return;
            }

            const pressureLossPascal =
                totalK *
                density *
                Math.pow(velocity, 2) /
                2;

            const pressureLossBar =
                pressureLossPascal /
                BAR_CONVERSION;

            lossResult.textContent =
                formatNumber(
                    pressureLossBar,
                    2
                );

            totalLossBar +=
                pressureLossBar;
        });

    latestLocalTotal =
        totalLossBar;

    localTotalElement.textContent =
        formatNumber(
            totalLossBar,
            2
        );

    updateSummary();
}


/* =========================================
   높이차에 의한 압력 계산
========================================= */

function calculateElevationPressure() {
    const density =
        getNumber(elevationDensityInput.value);

    const heightDifference =
        getNumber(heightDifferenceInput.value);

    if (
        density <= 0 ||
        heightDifference === 0
    ) {
        latestElevationTotal = 0;

        elevationResultElement.textContent =
            "0.00";

        updateSummary();

        return;
    }

    const pressurePascal =
        density *
        GRAVITY *
        heightDifference;

    const pressureBar =
        pressurePascal /
        BAR_CONVERSION;

    latestElevationTotal =
        pressureBar;

    elevationResultElement.textContent =
        formatNumber(
            pressureBar,
            2
        );

    updateSummary();
}


/* =========================================
   전체 차압 합계
========================================= */

function updateSummary() {
    const grandTotal =
        latestPipeTotal +
        latestLocalTotal +
        latestElevationTotal;

    summaryPipeElement.textContent =
        formatNumber(
            latestPipeTotal,
            2
        );

    summaryLocalElement.textContent =
        formatNumber(
            latestLocalTotal,
            2
        );

    summaryElevationElement.textContent =
        formatNumber(
            latestElevationTotal,
            2
        );

    grandTotalElement.textContent =
        formatNumber(
            grandTotal,
            2
        );
}


/* =========================================
   전체 초기화
========================================= */

function resetAll() {
    flowRateInput.value = "";

    areaResult.textContent = "-";
    velocityResult.textContent = "-";

    pipeRows.innerHTML = "";
    localRows.innerHTML = "";

    pipeRowCounter = 0;
    localRowCounter = 0;

    latestPipeTotal = 0;
    latestLocalTotal = 0;
    latestElevationTotal = 0;

    elevationDensityInput.value = "";
    heightDifferenceInput.value = "";

    updatePipeSizes();
    createPipeRow();
    createLocalRow();

    calculateElevationPressure();
    updateSummary();
}


/* =========================================
   이벤트 등록
========================================= */

pipeTypeSelect.addEventListener(
    "change",
    updatePipeSizes
);

pipeSizeSelect.addEventListener(
    "change",
    calculateVelocity
);

flowRateInput.addEventListener(
    "input",
    calculateVelocity
);

elevationDensityInput.addEventListener(
    "input",
    calculateElevationPressure
);

heightDifferenceInput.addEventListener(
    "input",
    calculateElevationPressure
);

addPipeRowButton.addEventListener(
    "click",
    () => {
        createPipeRow();
    }
);

addLocalRowButton.addEventListener(
    "click",
    () => {
        createLocalRow();
    }
);

resetAllButton.addEventListener(
    "click",
    resetAll
);


/* =========================================
   최초 실행
========================================= */

updatePipeSizes();

createPipeRow();

createLocalRow();

calculateElevationPressure();
updateSummary();
