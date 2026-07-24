const pipeInnerDiameters = {
    susTube: {
        '1/4"': 4.75,
        '3/8"': 7.745,
        '1/2"': 10.22,
        '3/4"': 15.75,
        '1"': 22.1,
        '1-1/4"': 28.45,
        '1-1/2"': 34.8
    },

    flexibleA: {
        '1/4"': 6.1,
        '3/8"': 10.37,
        '1/2"': 13.86,
        '3/4"': 20.67,
        '1"': 27.1,
        '1-1/4"': 33,
        '1-1/2"': 39
    },

    flexibleB: {
        '1/4"': 8.5,
        '3/8"': 10,
        '1/2"': 12,
        '3/4"': 16,
        '1"': 21.5,
        '1-1/4"': 28
    }
};

const pipeTypeSelect = document.getElementById("pipeType");
const pipeSizeSelect = document.getElementById("pipeSize");
const flowRateInput = document.getElementById("flowRate");
const calculateButton = document.getElementById("calculateButton");
const errorMessage = document.getElementById("errorMessage");
const velocityResult = document.getElementById("velocityResult");

pipeTypeSelect.addEventListener("change", function () {
    const selectedPipeType = pipeTypeSelect.value;

    pipeSizeSelect.innerHTML = "";
    errorMessage.textContent = "";
    resetResult();

    if (selectedPipeType === "") {
        pipeSizeSelect.disabled = true;

        const option = document.createElement("option");
        option.value = "";
        option.textContent = "먼저 관 종류를 선택하세요";

        pipeSizeSelect.appendChild(option);
        return;
    }

    pipeSizeSelect.disabled = false;

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "호칭경을 선택하세요";
    pipeSizeSelect.appendChild(defaultOption);

    const selectedPipeSizes = pipeInnerDiameters[selectedPipeType];

    for (const pipeSize in selectedPipeSizes) {
        const option = document.createElement("option");

        option.value = pipeSize;
        option.textContent = pipeSize;

        pipeSizeSelect.appendChild(option);
    }
});

pipeSizeSelect.addEventListener("change", function () {
    errorMessage.textContent = "";
    resetResult();
});

flowRateInput.addEventListener("input", function () {
    errorMessage.textContent = "";
    resetResult();
});

flowRateInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        calculateVelocity();
    }
});

calculateButton.addEventListener("click", calculateVelocity);

function calculateVelocity() {
    errorMessage.textContent = "";

    const selectedPipeType = pipeTypeSelect.value;
    const selectedPipeSize = pipeSizeSelect.value;
    const flowRateLpm = Number(flowRateInput.value);

    if (selectedPipeType === "") {
        showError("관 종류를 선택하세요.");
        return;
    }

    if (selectedPipeSize === "") {
        showError("호칭경을 선택하세요.");
        return;
    }

    if (
        flowRateInput.value.trim() === "" ||
        !Number.isFinite(flowRateLpm) ||
        flowRateLpm <= 0
    ) {
        showError("유량은 0보다 큰 숫자로 입력하세요.");
        return;
    }

    const innerDiameterMm =
        pipeInnerDiameters[selectedPipeType][selectedPipeSize];

    const innerDiameterM =
        innerDiameterMm / 1000;

    const crossSectionalAreaM2 =
        Math.PI * Math.pow(innerDiameterM, 2) / 4;

    const flowRateM3s =
        flowRateLpm / 60000;

    const velocity =
        flowRateM3s / crossSectionalAreaM2;

    velocityResult.textContent =
        formatNumber(velocity, 3);
}

function showError(message) {
    errorMessage.textContent = message;
    resetResult();
}

function resetResult() {
    velocityResult.textContent = "-";
}

function formatNumber(value, decimalPlaces) {
    return value.toLocaleString("ko-KR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimalPlaces
    });
}