export function buildProfitInsight(options) {
    const title = options.isVi ? '🎯 Đã chọn: Nguồn lợi nhuận cốt lõi' : '🎯 Selected: Core Profit Drivers';
    const streamBullets = [];
    const formatNumber = options.formatNumber || (value => value.toLocaleString());

    if (options.sortedStreams.length > 0) {
        const top = options.sortedStreams[0];
        const name = options.prettyItem(top.item_name);
        const hourly = Math.round(top.rate_per_second * 3600);
        const percent = options.totalHourlyCoins > 0 ? Math.round((hourly / options.totalHourlyCoins) * 100) : 0;
        const rawFacility = top.facility ? top.facility.replace(/ \((Manual|Electric|Prismana)\)$/, '') : '';
        const facility = options.getFacilityDisplayName(rawFacility);
        const unitsPerHour = options.perHour(top.units_per_second);
        streamBullets.push(options.isVi
            ? `• <strong>${name}</strong> tại <strong>${facility}</strong> là trụ cột lợi nhuận số 1: sản xuất <strong>${unitsPerHour}/giờ</strong>, đem về <strong>${formatNumber(hourly)} coin / giờ</strong> (chiếm <strong>${percent}%</strong> tổng doanh thu).`
            : `• <strong>${name}</strong> at <strong>${facility}</strong> is the #1 profit driver: producing <strong>${unitsPerHour}/hr</strong>, yielding <strong>${formatNumber(hourly)} coins/hour</strong> (<strong>${percent}%</strong> share).`);
    }
    if (options.sortedStreams.length > 1) {
        const top = options.sortedStreams[1];
        const name = options.prettyItem(top.item_name);
        const hourly = Math.round(top.rate_per_second * 3600);
        const percent = options.totalHourlyCoins > 0 ? Math.round((hourly / options.totalHourlyCoins) * 100) : 0;
        const rawFacility = top.facility ? top.facility.replace(/ \((Manual|Electric|Prismana)\)$/, '') : '';
        const facility = options.getFacilityDisplayName(rawFacility);
        streamBullets.push(options.isVi
            ? `• <strong>${name}</strong> tại <strong>${facility}</strong> là nguồn thu lớn thứ 2: đem về <strong>${formatNumber(hourly)} coin / giờ</strong> (${percent}%).`
            : `• <strong>${name}</strong> at <strong>${facility}</strong> is #2: earning <strong>${formatNumber(hourly)} coins/hour</strong> (${percent}%).`);
    }
    if (options.sortedStreams.length > 2) {
        const top = options.sortedStreams[2];
        const hourly = Math.round(top.rate_per_second * 3600);
        const percent = options.totalHourlyCoins > 0 ? Math.round((hourly / options.totalHourlyCoins) * 100) : 0;
        if (percent >= 5) {
            const name = options.prettyItem(top.item_name);
            const rawFacility = top.facility ? top.facility.replace(/ \((Manual|Electric|Prismana)\)$/, '') : '';
            const facility = options.getFacilityDisplayName(rawFacility);
            streamBullets.push(options.isVi
                ? `• <strong>${name}</strong> tại <strong>${facility}</strong> đóng góp <strong>${formatNumber(hourly)} coin / giờ</strong> (${percent}%).`
                : `• <strong>${name}</strong> at <strong>${facility}</strong> contributes <strong>${formatNumber(hourly)} coins/hour</strong> (${percent}%).`);
        }
    }

    const description = streamBullets.join('<br>')
        + `<br>• <strong>${options.isVi ? 'Tổng sản lượng Homeland:' : 'Total Homeland output:'}</strong> đạt <strong>${formatNumber(options.totalHourlyCoins)} ${options.isVi ? 'coin / giờ' : 'coins/hour'}</strong> (${options.unitRateDisplay}).<br>`
        + `<em><strong>${options.isVi ? 'Tại sao chọn:' : 'Why selected:'}</strong> ${options.isVi
            ? `Có tỷ suất lợi nhuận ròng trên nguyên liệu và thời gian gia công cao nhất trong toàn bộ các công thức đã mở khóa tại RV ${options.homeLevel}.`
            : `Highest net coin yield per processing second and ingredient cost among all unlocked recipes at RV ${options.homeLevel}.`}</em>`;
    return { title, description };
}
