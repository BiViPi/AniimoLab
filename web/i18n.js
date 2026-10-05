/**
 * AniimoLab i18n Translation Module
 * Supports Vietnamese ('vi') and English ('en')
 */

const I18N_STORAGE_KEY = 'aniimolab_lang';

const TRANSLATIONS = {
    vi: {
        // App header
        app_tagline: "Trình mô phỏng sản xuất & Tối ưu hóa Homeland",
        disclaimer: "Một số công thức, cấp độ và số lượng cơ sở chưa được xác nhận chính thức trong game; các mục này được đánh dấu rõ nơi sử dụng.",
        nav_facilities: "Công thức",
        nav_math: "Thuật toán",
        nav_guide: "Hướng dẫn",
        nav_theme: "Giao diện",
        nav_lang: "Tiếng Việt",

        // Card 1: Homeland & Power Grid
        homeland_title: "Homeland của bạn",
        clear_saved_btn: "Đặt lại dữ liệu",
        clear_saved_confirm: "Bạn có chắc muốn đặt lại toàn bộ dữ liệu đã lưu về mặc định?",
        rv_level: "Cấp RV",
        emode_title: "Chế độ điện (E-mode)",
        emode_generator: "Máy phát điện",
        emode_supply_rate: "Tỷ lệ cấp điện",
        emode_standard: "100% (Tiêu chuẩn)",
        emode_optimal: "120% (Tối ưu buff)",
        power_gauge_title: "⚡ Công suất máy phát:",
        emode_hint: "Tự động cân bằng điện trong giới hạn máy phát. Giải phóng công nhân Aniimo ở các cơ sở dùng điện; các cơ sở còn lại chạy thủ công với Aniimo.",
        simple_mode_hint: "Mặc định bạn đã xây dựng và nâng cấp tối đa mọi cơ sở theo cấp RV hiện tại.",
        simple_summary_title: "Chi tiết cơ sở & mô-đun",

        // Card 2: Level-Up Strategy & Inventory
        strategy_title: "Chiến lược nâng cấp RV",
        strategy_hint: "Sản xuất toàn bộ nguyên liệu cần cho cấp RV tiếp theo nhanh nhất có thể, sau đó tối đa hóa Home Coin từ năng lực sản xuất còn lại.",
        level_up_target: "Mục tiêu lên cấp RV",
        rv_costs: "Chi phí lên RV {level}",
        what_you_have: "Kho vật phẩm hiện có",
        what_you_have_hint: "Tính vào chi phí nâng cấp. Gỗ thô, Cát khoáng và nguyên liệu cấp thấp sẽ được tự động chế biến lên cấp cao hơn.",

        // Card 3: Season & Recipes
        season_title: "Lễ hội Trăng Thu hoạch",
        season_hint: "Sự kiện theo mùa với đơn vị tiền tệ riêng: Lúa mì Ánh trăng, dùng để mua hạt giống mùa vụ. Kế hoạch hiển thị lượng hạt giống cần dùng và điểm Harvest Moon kiếm được.",
        recipe_notes: "Ghi chú công thức",
        recipes_title: "Tùy chỉnh công thức",
        special_recipes_title: "Công thức đặc biệt",
        special_recipes_hint: "Các công thức này cần tiền tệ hiếm để mở khóa. Kế hoạch chỉ sử dụng các công thức bạn đã tích chọn.",
        recipes_to_skip: "Công thức cần bỏ qua",
        recipes_to_skip_hint: "Kế hoạch sẽ không sử dụng các công thức này. Bạn cũng có thể bỏ qua trực tiếp bằng nút ✕ trên bảng kế hoạch.",
        search_recipes_placeholder: "Tìm kiếm công thức...",
        skip_btn: "Bỏ qua",

        // CTA
        find_plan_btn: "Tìm kế hoạch tối ưu",
        solving_btn: "Đang tính toán tối ưu...",

        // Results Section
        level_up_label: "Nâng cấp RV",
        your_rate_label: "Tốc độ thu hoạch",
        unit_second: "/ giây",
        unit_minute: "/ phút",
        unit_hour: "/ giờ",
        unit_day: "/ ngày",
        unit_opt_second: "mỗi giây",
        unit_opt_minute: "mỗi phút",
        unit_opt_hour: "mỗi giờ",
        unit_opt_day: "mỗi ngày",

        // Facility Plan
        facility_plan_title: "Nhiệm vụ từng cơ sở sản xuất",
        how_to_read: "Cách đọc bảng này",
        seeds_to_plant_title: "Hạt giống cần gieo trồng",
        profit_by_product_title: "Lợi nhuận theo sản phẩm",
        profit_hint: "Đã trừ chi phí mua hạt giống.",

        // 2D Layout Simulator
        layout_title: "Mô phỏng bố cục Homeland 2D",
        how_laid_out: "Nguyên lý bố trí",
        show_whole_homeland: "Hiện toàn bộ Homeland",
        simulate_label: "Mô phỏng di chuyển",
        storage_units_label: "Kho lưu trữ (SU):",
        replay_btn: "Phát lại",

        // Sidebar
        insights_title: "Tại sao chọn kế hoạch này? & Phân tích",
        optimal_solved: "Tối ưu chuẩn xác",
        aniimo_team_title: "Tổ đội công nhân Aniimo",
        aniimo_best: "Tối ưu nhất",
        aniimo_minimum: "Tối thiểu",
        aniimo_custom: "Aniimo của tôi",
        opportunities_title: "Cơ hội cải thiện",
        set_goal_title: "Đặt mục tiêu tích lũy",
        goal_hint: "Cập nhật tức thì theo kế hoạch trên.",
        goal_label: "Mục tiêu",
        target_coins_label: "Home Coin mục tiêu",
        current_coins_label: "Home Coin hiện có",
        total_time_label: "Tổng thời gian cần",
        amount_produced_label: "Home Coin sản xuất được",
        product_breakdown_title: "Chi tiết sản phẩm",
        seeds_needed_title: "Hạt giống cần thiết",

        // Table headers
        th_facility: "Cơ sở",
        th_count: "Số lượng",
        th_producing: "Đang sản xuất",
        th_aniimo: "Aniimo",
        th_why: "Mục đích",
        th_crop: "Cây trồng",
        th_plots: "Ô đất",
        th_seeds: "Hạt giống",
        th_cost: "Chi phí",
        th_product: "Sản phẩm",
        th_sold_hour: "Bán / giờ",
        th_profit_hour: "Lợi nhuận / giờ",
        th_share: "Tỷ lệ",
        th_profit_until_rv: "Lợi nhuận đến RV {rv}",
        th_need: "Cần",
        th_have: "Có sẵn",
        th_ready_in: "Xong trong",
        th_how_many: "Số lượng",
        th_busy_avg: "Tỷ lệ bận TB",
        th_where: "Vị trí làm việc",

        // Modals
        modal_facilities_title: "Công thức các cơ sở",
        modal_facilities_hint: "Toàn bộ công thức trong dữ liệu game, phân nhóm theo cơ sở sản xuất.",
        modal_math_title: "Cơ chế hoạt động & Thuật toán",
        modal_guide_title: "Hướng dẫn sử dụng AniimoLab",
        modal_close: "Đóng",

        // Additional UI keys
        aniimo_explain_summary: "Cách tổ đội Aniimo được tính toán",
        unverified_badge: "chưa xác thực",
        unverified_title: "Chưa kiểm chứng trong game",
        special_badge: "đặc biệt",
        season_badge: "mùa vụ",
        emode_badge: "⚡ Chế độ điện",
        surplus_label: "Thặng dư:",
        proven_best: "tối ưu chuẩn xác",
        best_in_time: "tốt nhất theo thời gian",
        fastest_level_up: "Lên cấp nhanh nhất",
        min_team_plan: "Tổ đội Aniimo tối thiểu",
        facilities_heading: "Cơ sở",
        modules_heading: "Mô-đun",
        total_label: "Tổng cộng",
        not_yet: "chưa mở",
        free: "miễn phí",
        su_opt_3: "3 Kho lưu trữ (Nông trại, Xưởng, Trung tâm)",
        su_opt_4: "4 Kho lưu trữ (+ Lâm nghiệp)",
        su_opt_5: "5 Kho lưu trữ (+ Mở rộng)"
    },
    en: {
        // App header
        app_tagline: "Cyber Homeland Production Simulator & Multi-Hub Optimizer",
        disclaimer: "A few recipes, facility levels and counts haven't been confirmed in game yet; they're marked where they're used.",
        nav_facilities: "Facilities",
        nav_math: "Math",
        nav_guide: "Guide",
        nav_theme: "Theme",
        nav_lang: "English",

        // Card 1: Homeland & Power Grid
        homeland_title: "Your Homeland",
        clear_saved_btn: "Clear saved values",
        clear_saved_confirm: "Are you sure you want to reset all saved inputs to default?",
        rv_level: "RV level",
        emode_title: "Electric Mode (E-mode)",
        emode_generator: "Generator",
        emode_supply_rate: "Supply Rate",
        emode_standard: "100% (Standard)",
        emode_optimal: "120% (Optimal Buff)",
        power_gauge_title: "⚡ Generator Power:",
        emode_hint: "Auto-balances power within generator limit. Frees Aniimo workers on electric units; remaining units run manually with Aniimo.",
        simple_mode_hint: "Assumes you've built and upgraded everything your RV level allows.",
        simple_summary_title: "Facilities and modules",

        // Card 2: Level-Up Strategy & Inventory
        strategy_title: "RV Level-Up Strategy",
        strategy_hint: "Gets everything your next RV level costs as soon as possible, then earns as many Home Coins as that leaves room for.",
        level_up_target: "Level up to RV",
        rv_costs: "RV {level} costs",
        what_you_have: "What you already have",
        what_you_have_hint: "Counts toward the level-up. Wood Blocks, Mineral Sand and lower tiers get processed up.",

        // Card 3: Season & Recipes
        season_title: "Harvest Moon Festival",
        season_hint: "A seasonal event with its own currency, Moonray Wheat, which buys the season's seeds. Keeping enough wheat on hand is up to you; plans show how much their seeds use.",
        recipe_notes: "Recipe Notes",
        recipes_title: "Recipes",
        special_recipes_title: "Special recipes",
        special_recipes_hint: "These take a rare currency to unlock. Plans only use the ones you tick.",
        recipes_to_skip: "Recipes to skip",
        recipes_to_skip_hint: "Plans won't use these, e.g. recipes behind unlocks you don't have yet. You can also skip one straight from a plan with its ✕.",
        search_recipes_placeholder: "Search recipes",
        skip_btn: "Skip",

        // CTA
        find_plan_btn: "Find the best plan",
        solving_btn: "Solving...",

        // Results Section
        level_up_label: "Level-Up",
        your_rate_label: "Your Rate",
        unit_second: "/ sec",
        unit_minute: "/ min",
        unit_hour: "/ hr",
        unit_day: "/ day",
        unit_opt_second: "per second",
        unit_opt_minute: "per minute",
        unit_opt_hour: "per hour",
        unit_opt_day: "per day",

        // Facility Plan
        facility_plan_title: "What Each Facility Should Do",
        how_to_read: "How to read this",
        seeds_to_plant_title: "Seeds to Plant",
        profit_by_product_title: "Profit by Product",
        profit_hint: "Net of seed costs.",

        // 2D Layout Simulator
        layout_title: "Homeland 2D Layout Simulator",
        how_laid_out: "How it's laid out",
        show_whole_homeland: "Show whole homeland",
        simulate_label: "Simulate",
        storage_units_label: "Storage Units:",
        replay_btn: "Replay",

        // Sidebar
        insights_title: "Why this Plan? & Insights",
        optimal_solved: "Optimal Solved",
        aniimo_team_title: "Aniimo Team",
        aniimo_best: "Best",
        aniimo_minimum: "Minimum",
        aniimo_custom: "My Aniimo",
        opportunities_title: "Opportunities",
        set_goal_title: "Set a Goal",
        goal_hint: "Updates instantly from the plan above.",
        goal_label: "Goal",
        target_coins_label: "Target Home Coins",
        current_coins_label: "Current Home Coins",
        total_time_label: "Total Time",
        amount_produced_label: "Home Coins Produced",
        product_breakdown_title: "Product Breakdown",
        seeds_needed_title: "Seeds Needed",

        // Table headers
        th_facility: "Facility",
        th_count: "Count",
        th_producing: "Producing",
        th_aniimo: "Aniimo",
        th_why: "Why",
        th_crop: "Crop",
        th_plots: "Plots",
        th_seeds: "Seeds",
        th_cost: "Cost",
        th_product: "Product",
        th_sold_hour: "Sold per hour",
        th_profit_hour: "Profit per hour",
        th_share: "Share",
        th_profit_until_rv: "Profit until RV {rv}",
        th_need: "Need",
        th_have: "Have",
        th_ready_in: "Ready in",
        th_how_many: "How many",
        th_busy_avg: "Busy on average",
        th_where: "Where",

        // Modals
        modal_facilities_title: "Facility Recipes",
        modal_facilities_hint: "Every recipe in the game data, grouped by facility. This is a reference table, not tied to your owned facility counts or levels.",
        modal_math_title: "How It Works",
        modal_guide_title: "AniimoLab Guide",
        modal_close: "Close",

        // Additional UI keys
        aniimo_explain_summary: "How the team is worked out",
        unverified_badge: "unverified",
        unverified_title: "Not yet checked in game",
        special_badge: "special",
        season_badge: "season",
        emode_badge: "⚡ E-mode",
        surplus_label: "Surplus:",
        proven_best: "proven best",
        best_in_time: "best found in time",
        fastest_level_up: "Fastest Level-Up",
        homeland_layout: "Homeland Layout",
        min_team_plan: "Minimum Team Plan"
    }
};

const VI_FACILITY_NAMES = {
    'Farmland': 'Đất nông nghiệp',
    'Woodland': 'Vườn ươm',
    'Mine': 'Mỏ khoáng',
    'Well': 'Giếng nước',
    'Tidewhisper Sandcastle': 'Lâu đài cát Tidewhisper',
    'Dewy House': 'Nhà sương mai',
    'Nimbus Bed': 'Giường mây Nimbus',
    'Starfall Hammock': 'Võng sao Starfall',
    'Floral Windmill': 'Cối xay gió hoa',
    'Heat Furnace': 'Lò nhiệt',
    'Cooling Unit': 'Cơ sở làm mát',
    'Sunlamp': 'Đèn mặt trời',
    'Carousel Mill': 'Cối xay Carousel',
    'Crafting Table': 'Bàn chế tạo',
    'Claw Game Cooker': 'Bếp nấu gắp thú',
    'Simmering Pot': 'Nồi hầm',
    'Phonolfactory Table': 'Bàn hương âm thanh',
    'Bouncy Brew Keg': 'Thùng ủ lên men',
    'Blazing Stove': 'Bếp lửa Blazing',
    'Pickling Jar': 'Hũ ngâm dưa muối',
    'Jukebox Dryer': 'Máy sấy Jukebox',
    'Joy Wheel Loom': 'Khung dệt bánh xe',
    'Woodworking Bench': 'Bàn mộc',
    'Chimney Kiln': 'Lò nung ống khói',
    'Dance Pad Polisher': 'Máy đánh bóng đệm nhảy',
    'Aniipod Maker': 'Máy tạo Aniipod'
};

const VI_ENV_MODES = {
    'Scorching': 'Thiêu đốt',
    'Warm': 'Ấm áp',
    'Cool': 'Mát mẻ',
    'Freeze': 'Băng giá',
    'Adequate': 'Thích hợp',
    'Overlap': 'Giao thoa'
};

const VI_ABILITIES = {
    'Fire': 'Hỏa',
    'Water': 'Thủy',
    'Earth': 'Thổ',
    'Grass': 'Mộc',
    'Lightning': 'Lôi',
    'Wind': 'Phong',
    'Dark': 'Ám',
    'Artisanship': 'Chế tác',
    'Leisure': 'Giải trí',
    'Hauling': 'Vận chuyển',
    'Light': 'Quang',
    'Ice': 'Băng',
    'Perfumery': 'Điều hương'
};

const VI_MODULE_NAMES = {
    'ecological_module': 'Mô-đun sinh thái',
    'kitchen_module': 'Mô-đun bếp',
    'resource_detector': 'Máy dò tài nguyên',
    'crafting_module': 'Mô-đun chế tác',
    'Ecological Module': 'Mô-đun sinh thái',
    'Kitchen Module': 'Mô-đun bếp',
    'Resource Detector': 'Máy dò tài nguyên',
    'Crafting Module': 'Mô-đun chế tác'
};

const VI_ITEM_NAMES = {
    advanced_gemstone_dust: 'Bột đá quý cao cấp',
    advanced_lemon_incense: 'Hương chanh cao cấp',
    advanced_wind_chime: 'Chuông gió cao cấp',
    agave: 'Thùa gai',
    agave_drink: 'Nước thùa gai',
    agave_syrup: 'Siro thùa gai',
    aniipod: 'Aniipod',
    aniipod_mega: 'Aniipod Mega',
    aniipod_pro: 'Aniipod Pro',
    apple: 'Táo',
    apple_candy: 'Kẹo táo',
    apple_juice: 'Nước ép táo',
    apple_tart: 'Bánh tart táo',
    aromathyst: 'Thạch hương',
    bamboo: 'Tre',
    bamboo_joss_stick: 'Hương tre',
    bamboo_ware: 'Đồ tre đan',
    berry_chocolate_coconut_pudding: 'Pudding dừa sôcôla dâu',
    bouquet: 'Bó hoa',
    bread: 'Bánh mì',
    candied_orange_flower: 'Hoa cam ướp đường',
    candied_strawberries: 'Dâu tây bọc đường',
    caramel_nut_chips: 'Bánh hạt caramel',
    cherry_blossom: 'Hoa anh đào',
    cherry_blossom_rice_ball: 'Cơm nắm hoa anh đào',
    cherry_incense: 'Hương hoa anh đào',
    chestnut: 'Hạt dẻ',
    chestnut_puree: 'Hạt dẻ nghiền',
    cider_vinegar: 'Giấm táo',
    clay: 'Đất sét',
    coarse_sifted_ore: 'Quặng sàng thô',
    cocoa: 'Ca cao',
    cocoa_powder: 'Bột ca cao',
    cocoa_spread: 'Sốt bơ ca cao',
    coconut: 'Dừa',
    coconut_cocoa: 'Ca cao cốt dừa',
    coconut_cookie: 'Bánh quy dừa',
    coconut_cooler: 'Nước dừa giải khát',
    coconut_milk: 'Nước cốt dừa',
    coconut_oil: 'Dầu dừa',
    copper_ore: 'Quặng đồng',
    cotton: 'Bông vải',
    cotton_fabric: 'Vải cotton',
    cotton_thread: 'Chỉ bông',
    cranberry: 'Nam việt quất',
    cranberry_chocolate: 'Sôcôla nam việt quất',
    cranberry_jam: 'Mứt nam việt quất',
    cranberry_juice: 'Nước ép nam việt quất',
    creamy_potato_soup: 'Súp khoai tây kem',
    deep_rock_spring_water: 'Nước suối đá sâu',
    densified_timber_component: 'Cấu kiện gỗ nén',
    doll: 'Búp bê',
    dream_catcher: 'Lưới bắt giấc mơ',
    dried_apple_slices: 'Táo sấy lát',
    dried_bean_curd: 'Váng đậu sấy',
    dried_cherry_blossom: 'Hoa anh đào sấy',
    dried_cranberries: 'Nam việt quất sấy',
    dried_flowers: 'Hoa sấy',
    dried_ginseng: 'Nhân sâm sấy khô',
    dried_grapes: 'Nho khô',
    dried_lemon_slices: 'Chanh sấy lát',
    dried_strawberries: 'Dâu tây sấy',
    dye: 'Thuốc nhuộm',
    dyed_cotton_fabric: 'Vải cotton nhuộm màu',
    flower_bread: 'Bánh mì hoa',
    flowers_in_a_bottle: 'Hoa trong lọ',
    fresh_water: 'Nước ngọt',
    gem: 'Đá quý',
    gemstone_dust: 'Bột đá quý',
    ginseng: 'Nhân sâm',
    ginseng_chestnut_cake: 'Bánh hạt dẻ nhân sâm',
    ginseng_porridge: 'Cháo nhân sâm',
    ginseng_powder: 'Bột nhân sâm',
    ginseng_water: 'Nước nhân sâm',
    grape: 'Nho',
    grape_candy: 'Kẹo nho',
    grape_jam: 'Mứt nho',
    grape_juice: 'Nước ép nho',
    grape_lemon_drink: 'Nước nho chanh',
    growth_bud: 'Mầm trưởng thành',
    growth_flower: 'Hoa trưởng thành',
    growth_fruit: 'Quả trưởng thành',
    harvest_platter: 'Mâm cỗ mùa thu hoạch',
    herbal_ginseng_aroma: 'Hương thảo dược nhân sâm',
    hot_cocoa: 'Ca cao nóng',
    jello: 'Thạch rau câu',
    laminated_beams: 'Dầm gỗ ép',
    lavender: 'Oải hương',
    lavender_cookies: 'Bánh quy oải hương',
    lavender_incense: 'Hương oải hương',
    lavender_powder: 'Bột oải hương',
    lavender_sachet: 'Túi thơm oải hương',
    lemon: 'Chanh',
    lemon_incense: 'Hương chanh',
    lotion: 'Dưỡng chất thơm',
    malt_sugar: 'Mạch nha',
    maple_candy_apple_jam: 'Mứt táo kẹo phong',
    maple_candy_roasted_potatoes: 'Khoai tây nướng kẹo phong',
    maple_candy_star: 'Ngôi sao kẹo phong',
    maple_sugar_chunk: 'Đường phong thô',
    maple_syrup: 'Siro phong',
    microcrystalline_ore_plate: 'Tấm quặng vi tinh thể',
    milled_rice: 'Gạo xát',
    mixed_perfume: 'Nước hoa tổng hợp',
    moondew_radish: 'Củ cải sương trăng',
    moondew_radish_slices: 'Củ cải sương trăng thái lát',
    natural_mineral_spring_water: 'Nước khoáng tự nhiên',
    natural_rubber: 'Cao su tự nhiên',
    nuts: 'Các loại hạt',
    orange_flower: 'Hoa cam',
    orange_flower_dew: 'Sương hoa cam',
    orange_flower_incense: 'Hương hoa cam',
    palm_bark: 'Vỏ cọ',
    palm_rope: 'Dây thừng cọ',
    pearl: 'Ngọc trai',
    pearl_necklace: 'Vòng cổ ngọc trai',
    petals: 'Cánh hoa',
    plain_rice_porridge: 'Cháo trắng',
    porcelain: 'Đồ sứ',
    potato: 'Khoai tây',
    potato_chips: 'Khoai tây chiên',
    potato_kvass: 'Kvass khoai tây',
    pottery: 'Đồ gốm',
    premium_berry_chocolate_coconut_pudding: 'Pudding dừa sôcôla dâu thượng hạng',
    premium_bread: 'Bánh mì thượng hạng',
    premium_jello: 'Thạch rau câu thượng hạng',
    premium_mixed_perfume: 'Nước hoa thượng hạng',
    premium_potato_soup: 'Súp khoai tây thượng hạng',
    premium_river_washed_stones: 'Đá cuội thượng hạng',
    premium_rose_freshener: 'Sáp thơm hoa hồng thượng hạng',
    premium_salted_lemon: 'Chanh muối thượng hạng',
    premium_soap: 'Xà phòng thượng hạng',
    premium_sweet_rice_wine: 'Rượu nếp ngọt thượng hạng',
    premium_wheat: 'Lúa mì thượng hạng',
    quartz_ore: 'Quặng thạch anh',
    quick_aromathyst: 'Thạch hương nhanh',
    quick_bamboo: 'Tre nhanh',
    quick_coconut: 'Dừa nhanh',
    quick_deep_rock_spring_water: 'Nước suối đá sâu nhanh',
    quick_fresh_water: 'Nước ngọt nhanh',
    quick_lemon: 'Chanh nhanh',
    quick_maple_syrup: 'Siro phong nhanh',
    quick_natural_mineral_spring_water: 'Nước khoáng tự nhiên nhanh',
    quick_potato: 'Khoai tây nhanh',
    quick_rice: 'Lúa nước nhanh',
    quick_scales: 'Vảy rồng nhanh',
    quick_sea_salt: 'Muối biển nhanh',
    quick_strawberry: 'Dâu tây nhanh',
    quick_well_water: 'Nước giếng nhanh',
    quick_wheat: 'Lúa mì nhanh',
    quick_wool: 'Lông cừu nhanh',
    refined_flour: 'Bột tinh luyện',
    refined_ore: 'Quặng tinh chế',
    rice: 'Lúa nước',
    rice_drink: 'Nước gạo',
    rice_vinegar: 'Giấm gạo',
    rich_grape_compote: 'Mứt nho đậm đặc',
    river_washed_stones: 'Đá cuội sông',
    roasted_soybeans: 'Đậu nành rang',
    roasted_waxing_moon_pepper: 'Hạt tiêu trăng thượng huyền rang',
    rock: 'Đá vụn',
    rock_candy: 'Kẹo đá',
    rose: 'Hoa hồng',
    rose_concentrate: 'Tinh chất hoa hồng',
    rose_freshener: 'Sáp thơm hoa hồng',
    rose_incense: 'Hương hoa hồng',
    rose_shortbread: 'Bánh quy hoa hồng',
    rough_lumber: 'Gỗ thô xẻ',
    rubber_duck: 'Vịt cao su',
    salted_cherry_blossom: 'Hoa anh đào ngâm muối',
    salted_lemon: 'Chanh muối',
    scales: 'Vảy rồng',
    sea_salt: 'Muối biển',
    shell: 'Vỏ sò',
    shell_ornament: 'Vật phẩm trang trí vỏ sò',
    shredded_coconut: 'Cơm dừa sấy',
    sintered_ore_brick: 'Gạch quặng thiêu kết',
    soap: 'Xà phòng',
    soy_sauce: 'Nước tương',
    soy_sauce_fried_rice: 'Cơm chiên nước tương',
    soy_sauce_tofu: 'Đậu phụ sốt tương',
    soybean: 'Đậu nành',
    standard_planks: 'Ván gỗ tiêu chuẩn',
    star: 'Ngôi sao',
    star_wish_lantern: 'Đèn lồng ước sao',
    steamed_vermicelli_roll: 'Bánh cuốn hấp',
    strawberry: 'Dâu tây',
    strawberry_candy: 'Kẹo dâu tây',
    strawberry_cream_puff: 'Bánh su kem dâu',
    strawberry_jam: 'Mứt dâu tây',
    strawberry_juice: 'Nước ép dâu tây',
    sugar_roasted_chestnuts: 'Hạt dẻ rang đường',
    sugarcane: 'Mía',
    sugarcane_juice: 'Nước mía',
    sweet_rice_drink: 'Nước gạo ngọt',
    tanghulu: 'Kẹo hồ lô',
    toasted_rice_green_tea: 'Trà xanh gạo rang',
    tofu: 'Đậu phụ',
    umbral_hot_pot: 'Lẩu bóng tối',
    umbral_pickle: 'Dưa muối bóng tối',
    umbral_sweet_and_spicy_sauce: 'Sốt cay ngọt bóng tối',
    walnut: 'Quả óc chó',
    walnut_cake: 'Bánh óc chó',
    walnut_milk: 'Sữa óc chó',
    waxing_moon_pepper: 'Hạt tiêu trăng thượng huyền',
    well_water: 'Nước giếng',
    wheat: 'Lúa mì',
    wheat_tea: 'Trà lúa mì',
    wheatmeal: 'Bột lúa mì',
    willow_wood: 'Gỗ liễu',
    wind_chime: 'Chuông gió',
    wood_sculpture: 'Tượng điêu khắc gỗ',
    wool: 'Lông cừu',
    wool_fabric: 'Vải len',
    woolen_yarn: 'Sợi len',
    woven_toy: 'Đồ chơi đan sợi',
    // Fallbacks
    coins: 'Home Coins',
    wood_block: 'Khối gỗ',
    mineral_sand: 'Cát khoáng',
    plywood: 'Dăm gỗ ép'
};

let currentLang = 'vi';

function initI18n() {
    try {
        const saved = localStorage.getItem(I18N_STORAGE_KEY);
        if (saved === 'vi' || saved === 'en') {
            currentLang = saved;
        } else {
            // Default to Vietnamese as requested
            currentLang = 'vi';
        }
    } catch (e) {
        currentLang = 'vi';
    }
    applyI18n();
}

function getLang() {
    return currentLang;
}

function setLang(lang) {
    if (lang !== 'vi' && lang !== 'en') return;
    currentLang = lang;
    try {
        localStorage.setItem(I18N_STORAGE_KEY, lang);
    } catch (e) {}
    applyI18n();
    // Dispatch event so app.js can re-render dynamic tables if needed
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function toggleLang() {
    setLang(currentLang === 'vi' ? 'en' : 'vi');
}

function t(key, fallback = '') {
    const bundle = TRANSLATIONS[currentLang] || TRANSLATIONS.vi;
    if (bundle && bundle[key] !== undefined) {
        return bundle[key];
    }
    const fallbackBundle = TRANSLATIONS.en;
    if (fallbackBundle && fallbackBundle[key] !== undefined) {
        return fallbackBundle[key];
    }
    return fallback || key;
}

function applyI18n() {
    // 1. Text elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            const val = t(key);
            if (val) el.textContent = val;
        }
    });

    // 2. Titles with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
            const val = t(key);
            if (val) el.setAttribute('title', val);
        }
    });

    // 3. Placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            const val = t(key);
            if (val) el.setAttribute('placeholder', val);
        }
    });

    // 4. Update language toggle button label
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        langBtn.innerHTML = currentLang === 'vi' 
            ? '<span class="btn-sym">🇻🇳</span> VI' 
            : '<span class="btn-sym">🇬🇧</span> EN';
        langBtn.title = currentLang === 'vi' ? 'Chuyển sang English' : 'Chuyển sang Tiếng Việt';
    }

    // 5. Update html lang attribute
    document.documentElement.lang = currentLang;
}

// Export to window for global access
window.VI_FACILITY_NAMES = VI_FACILITY_NAMES;
window.VI_MODULE_NAMES = VI_MODULE_NAMES;
window.VI_ENV_MODES = VI_ENV_MODES;
window.VI_ABILITIES = VI_ABILITIES;
window.VI_ITEM_NAMES = VI_ITEM_NAMES;

window.i18n = {
    init: initI18n,
    getLang,
    setLang,
    toggleLang,
    t,
    apply: applyI18n,
    translations: TRANSLATIONS,
    facilities: VI_FACILITY_NAMES,
    modules: VI_MODULE_NAMES,
    modes: VI_ENV_MODES,
    abilities: VI_ABILITIES,
    items: VI_ITEM_NAMES
};
window.t = t;
window.th = (key, fallback) => t(key, fallback);
