"use strict";

const assert = require("node:assert/strict");

const {mock_esm, set_global, zrequire} = require("./lib/namespace.cjs");
const {run_test, noop} = require("./lib/test.cjs");
const $ = require("./lib/zjquery.cjs");
const {page_params} = require("./lib/zpage_params.cjs");

const people = zrequire("people");
const {set_current_user, set_realm} = zrequire("state_data");

set_global("document", "document-stub");

page_params.realm_users = [];
const current_user = {};
set_current_user(current_user);

// We use this with override.
let unread_unmuted_count;
let stream_has_any_unread_mentions;

const topic_list = mock_esm("../src/topic_list");
const scroll_util = mock_esm("../src/scroll_util", {
    scroll_element_into_container() {},
    get_scroll_element: ($element) => $element,
});
mock_esm("../src/unread", {
    unread_count_info_for_stream: () => ({
        unmuted_count: unread_unmuted_count,
        stream_is_muted: false,
        muted_count: 0,
    }),
    stream_has_any_unread_mentions: () => stream_has_any_unread_mentions,
    stream_has_any_unmuted_mentions: () => noop,
});
mock_esm("../src/group_permission_settings", {
    get_group_permission_setting_config: () => ({
        allow_everyone_group: true,
    }),
});

const {Filter} = zrequire("../src/filter");
const stream_data = zrequire("stream_data");
const stream_list = zrequire("stream_list");
stream_list.set_update_inbox_channel_view_callback(noop);
const stream_list_sort = zrequire("stream_list_sort");
const user_groups = zrequire("user_groups");
const {initialize_user_settings} = zrequire("user_settings");
const settings_config = zrequire("settings_config");

// Start with always filtering out inactive streams.
const user_settings = {
    demote_inactive_streams: settings_config.demote_inactive_streams_values.always.code,
    web_channel_default_view: settings_config.web_channel_default_view_values.channel_feed.code,
};
initialize_user_settings({user_settings});
stream_list_sort.set_filter_out_inactives();

const realm = {
    realm_topics_policy: "allow_empty_topic",
};
set_realm(realm);

const me = {
    email: "me@example.com",
    user_id: 30,
    full_name: "Me Myself",
    date_joined: new Date(),
};

people.add_active_user(me);
people.initialize_current_user(me.user_id);

const everyone_group = {
    name: "Everyone",
    id: 1,
    description: "",
    members: new Set([30]),
    direct_subgroup_ids: new Set([]),
};

user_groups.initialize({realm_user_groups: [everyone_group]});

const devel = {
    name: "devel",
    stream_id: 100,
    color: "blue",
    subscribed: true,
    pin_to_top: true,
    is_recently_active: false,
    can_send_message_group: everyone_group.id,
};

const social = {
    name: "social",
    stream_id: 200,
    color: "green",
    subscribed: true,
    is_recently_active: true,
    can_send_message_group: everyone_group.id,
};

// flag to check if subheader is rendered
let pinned_subheader_flag = false;
let active_subheader_flag = false;
let inactive_subheader_flag = false;

function create_devel_sidebar_row({mock_template}) {
    const $devel_count = $.create("devel-count");
    const $subscription_block = $.create("devel-block");
    const $devel_unread_mention_info = $.create("devel-unread-mention-info");

    const $sidebar_row = $("<devel-sidebar-row-stub>");

    $sidebar_row.set_find_results(".subscription_block", $subscription_block);
    $subscription_block.set_find_results(".unread_count", $devel_count);
    $subscription_block.set_find_results(".unread_mention_info", $devel_unread_mention_info);

    mock_template("stream_sidebar_row.hbs", false, (data) => {
        assert.equal(data.url, "#narrow/channel/100-devel");
        return "<devel-sidebar-row-stub>";
    });

    unread_unmuted_count = 42;
    stream_has_any_unread_mentions = false;
    stream_list.create_sidebar_row(devel);
    assert.equal($devel_count.text(), "42");
    assert.equal($devel_unread_mention_info.text(), "");
}

function create_social_sidebar_row({mock_template}) {
    const $social_count = $.create("social-count");
    const $subscription_block = $.create("social-block");
    const $social_unread_mention_info = $.create("social-unread-mention-info");

    const $sidebar_row = $("<social-sidebar-row-stub>");

    $sidebar_row.set_find_results(".subscription_block", $subscription_block);
    $subscription_block.set_find_results(".unread_count", $social_count);
    $subscription_block.set_find_results(".unread_mention_info", $social_unread_mention_info);

    mock_template("stream_sidebar_row.hbs", false, (data) => {
        assert.equal(data.url, "#narrow/channel/200-social");
        return "<social-sidebar-row-stub>";
    });

    unread_unmuted_count = 99;
    stream_has_any_unread_mentions = true;
    stream_list.create_sidebar_row(social);
    assert.equal($social_count.text(), "99");
    assert.equal($social_unread_mention_info.text(), "@");
}

function create_stream_subheader({mock_template}) {
    mock_template("streams_subheader.hbs", false, (data) => {
        if (data.subheader_name === "translated: Pinned") {
            pinned_subheader_flag = true;
            return "<pinned-subheader-stub>";
        } else if (data.subheader_name === "translated: Active") {
            active_subheader_flag = true;
            return "<active-subheader-stub>";
        }

        assert.ok(data.subheader_name === "translated: Inactive");
        inactive_subheader_flag = true;
        return "<inactive-subheader-stub>";
    });
}

function test_ui(label, f) {
    run_test(label, (helpers) => {
        stream_data.clear_subscriptions();
        stream_list.stream_sidebar.rows.clear();
        f(helpers);
    });
}

test_ui("create_sidebar_row", ({override, mock_template}) => {
    // Make a couple calls to create_sidebar_row() and make sure they
    // generate the right markup as well as play nice with get_stream_li().
    override(user_settings, "demote_inactive_streams", 1);

    stream_data.add_sub(devel);
    stream_data.add_sub(social);

    create_devel_sidebar_row({mock_template});
    create_social_sidebar_row({mock_template});
    create_stream_subheader({mock_template});

    topic_list.get_stream_li = noop;

    const $pinned_subheader = $("<pinned-subheader-stub>");
    const $active_subheader = $("<active-subheader-stub>");
    const $devel_sidebar = $("<devel-sidebar-row-stub>");
    const $social_sidebar = $("<social-sidebar-row-stub>");

    let appended_elems;
    $("#stream_filters").append = (elems) => {
        appended_elems = elems;
    };

    let topics_closed;
    topic_list.close = () => {
        topics_closed = true;
    };

    stream_list.build_stream_list();

    assert.ok(topics_closed);
    const expected_elems = [
        $pinned_subheader, // separator
        $devel_sidebar, // pinned
        $active_subheader, // separator
        $social_sidebar, // not pinned
    ];

    assert.deepEqual(appended_elems, expected_elems);
    assert.ok(pinned_subheader_flag);
    assert.ok(active_subheader_flag);

    const $social_li = $("<social-sidebar-row-stub>");
    const stream_id = social.stream_id;

    $social_li.length = 0;

    const $privacy_elem = $.create("privacy-stub");
    $social_li.set_find_results(".stream-privacy", $privacy_elem);

    social.invite_only = true;
    social.color = "#222222";

    mock_template("stream_privacy.hbs", false, (data) => {
        assert.equal(data.invite_only, true);
        return "<div>privacy-html";
    });
    stream_list.redraw_stream_privacy(social);
    assert.equal($privacy_elem.html(), "<div>privacy-html");

    stream_list.set_in_home_view(stream_id, false);
    assert.ok($social_li.hasClass("out_of_home_view"));

    stream_list.set_in_home_view(stream_id, true);
    assert.ok(!$social_li.hasClass("out_of_home_view"));

    const row = stream_list.stream_sidebar.get_row(stream_id);
    social.is_recently_active = true;
    row.update_whether_active();
    assert.ok(!$social_li.hasClass("inactive_stream"));

    social.is_recently_active = false;
    row.update_whether_active();
    assert.ok($social_li.hasClass("inactive_stream"));

    let removed;
    $social_li.remove = () => {
        removed = true;
    };

    row.remove();
    assert.ok(removed);
});

test_ui("pinned_streams_never_inactive", ({mock_template}) => {
    stream_data.add_sub(devel);
    stream_data.add_sub(social);

    create_devel_sidebar_row({mock_template});
    create_social_sidebar_row({mock_template});
    create_stream_subheader({mock_template});

    // non-pinned streams can be made inactive
    const $social_sidebar = $("<social-sidebar-row-stub>");
    let stream_id = social.stream_id;
    let row = stream_list.stream_sidebar.get_row(stream_id);
    social.is_recently_active = false;

    stream_list.build_stream_list();
    assert.ok($social_sidebar.hasClass("inactive_stream"));

    social.is_recently_active = true;
    row.update_whether_active();
    assert.ok(!$social_sidebar.hasClass("inactive_stream"));

    social.is_recently_active = false;
    row.update_whether_active();
    assert.ok($social_sidebar.hasClass("inactive_stream"));

    // pinned streams can never be made inactive
    const $devel_sidebar = $("<devel-sidebar-row-stub>");
    stream_id = devel.stream_id;
    row = stream_list.stream_sidebar.get_row(stream_id);
    social.is_recently_active = false;

    stream_list.build_stream_list();
    assert.ok(!$devel_sidebar.hasClass("inactive_stream"));

    row.update_whether_active();
    assert.ok(!$devel_sidebar.hasClass("inactive_stream"));
});

function add_row(sub) {
    stream_data.add_sub(sub);
    const row = {
        update_whether_active() {},
        get_li() {
            const html = "<" + sub.name + "-sidebar-row-stub>";
            const $obj = $(html);

            $obj.length = 1; // bypass blueslip error

            return $obj;
        },
    };
    stream_list.stream_sidebar.set_row(sub.stream_id, row);
}

const develSub = {
    name: "devel",
    stream_id: 1000,
    color: "blue",
    pin_to_top: true,
    subscribed: true,
    is_recently_active: true,
    can_send_message_group: everyone_group.id,
};

const RomeSub = {
    name: "Rome",
    stream_id: 2000,
    color: "blue",
    pin_to_top: true,
    subscribed: true,
    is_recently_active: true,
    can_send_message_group: everyone_group.id,
};

const testSub = {
    name: "test",
    stream_id: 3000,
    color: "blue",
    pin_to_top: true,
    subscribed: true,
    is_recently_active: true,
    can_send_message_group: everyone_group.id,
    is_muted: true,
};

const announceSub = {
    name: "announce",
    stream_id: 4000,
    color: "green",
    pin_to_top: false,
    subscribed: true,
    is_recently_active: true,
    can_send_message_group: everyone_group.id,
};

const DenmarkSub = {
    name: "Denmark",
    stream_id: 5000,
    color: "green",
    pin_to_top: false,
    subscribed: true,
    is_recently_active: true,
    can_send_message_group: everyone_group.id,
};

const carSub = {
    name: "cars",
    stream_id: 6000,
    color: "green",
    pin_to_top: false,
    subscribed: true,
    is_recently_active: false,
    can_send_message_group: everyone_group.id,
};

function initialize_stream_data() {
    // pinned streams
    add_row(develSub);
    add_row(RomeSub);
    add_row(testSub);

    // unpinned streams
    add_row(announceSub);
    add_row(DenmarkSub);
    add_row(carSub);

    stream_list.build_stream_list();
}

function elem($obj) {
    return {to_$: () => $obj};
}

test_ui("zoom_in_and_zoom_out", ({mock_template}) => {
    topic_list.setup_topic_search_typeahead = noop;

    const $splitter = $.create("<active-subheader-stub>");

    $splitter.show();
    assert.ok($splitter.visible());

    $.create(".streams_subheader", {
        children: [elem($splitter)],
    });

    const $stream_li1 = $.create("stream1 stub");
    const $stream_li2 = $.create("stream2 stub");

    function make_attr(arg) {
        return (sel) => {
            assert.equal(sel, "data-stream-id");
            return arg;
        };
    }

    $stream_li1.attr = make_attr("42");
    $stream_li1.hide();
    $stream_li2.attr = make_attr("99");

    $.create("#stream_filters li.narrow-filter", {
        children: [elem($stream_li1), elem($stream_li2)],
    });

    $("#stream-filters-container")[0] = {
        dataset: {},
    };
    stream_list.initialize_stream_cursor();

    mock_template("filter_topics.hbs", false, () => "<filter-topics-stub>");
    let filter_topics_appended = false;
    $stream_li1.children = () => ({
        append($element) {
            assert.equal($element.selector, "<filter-topics-stub>");
            filter_topics_appended = true;
        },
    });
    stream_list.zoom_in_topics({stream_id: 42});

    assert.ok(!$splitter.visible());
    assert.ok(!$stream_li1.hasClass("hide"));
    assert.ok($stream_li2.hasClass("hide"));
    assert.ok($("#streams_list").hasClass("zoom-in"));
    assert.ok(filter_topics_appended);

    $("#stream_filters li.narrow-filter").toggleClass = (classname, value) => {
        $stream_li1.toggleClass(classname, value);
        $stream_li2.toggleClass(classname, value);
    };

    $stream_li1.length = 1;
    $(".filter-topics").remove = () => {
        filter_topics_appended = false;
    };
    stream_list.zoom_out_topics({$stream_li: $stream_li1});

    assert.ok($splitter.visible());
    assert.ok(!$stream_li1.hasClass("hide"));
    assert.ok(!$stream_li2.hasClass("hide"));
    assert.ok($("#streams_list").hasClass("zoom-out"));
    assert.ok(!filter_topics_appended);
});

test_ui("narrowing", ({mock_template}) => {
    create_stream_subheader({mock_template});
    initialize_stream_data();

    topic_list.close = noop;
    topic_list.rebuild_left_sidebar = noop;
    topic_list.active_stream_id = noop;
    topic_list.get_stream_li = noop;
    $("#streams_header").outerHeight = () => 0;

    assert.ok(!$("<devel-sidebar-row-stub>").hasClass("active-filter"));

    let filter;

    filter = new Filter([{operator: "stream", operand: develSub.stream_id.toString()}]);
    stream_list.handle_narrow_activated(filter);
    assert.ok($("<devel-sidebar-row-stub>").hasClass("active-filter"));

    filter = new Filter([
        {operator: "stream", operand: carSub.stream_id.toString()},
        {operator: "topic", operand: "sedans"},
    ]);
    stream_list.handle_narrow_activated(filter);
    assert.ok(!$("ul.filters li").hasClass("active-filter"));
    assert.ok(!$("<cars-sidebar-row-stub>").hasClass("active-filter")); // false because of topic

    filter = new Filter([{operator: "stream", operand: carSub.stream_id.toString()}]);
    stream_list.handle_narrow_activated(filter);
    assert.ok(!$("ul.filters li").hasClass("active-filter"));
    assert.ok($("<cars-sidebar-row-stub>").hasClass("active-filter"));

    let removed_classes;
    $("ul#stream_filters li").removeClass = (classes) => {
        removed_classes = classes;
    };

    let topics_closed;
    topic_list.close = () => {
        topics_closed = true;
    };

    stream_list.handle_message_view_deactivated();
    assert.equal(removed_classes, "active-filter stream-expanded");
    assert.ok(topics_closed);
});

test_ui("focusout_user_filter", () => {
    stream_list.set_event_handlers({show_channel_feed() {}});
    const e = {};
    const click_handler = $(".stream-list-filter").get_on_handler("focusout");
    click_handler(e);
});

test_ui("focus_user_filter", () => {
    stream_list.set_event_handlers({show_channel_feed() {}});

    initialize_stream_data();
    stream_list.build_stream_list();

    const e = {
        stopPropagation() {},
    };
    const click_handler = $(".stream-list-filter").get_on_handler("click");
    click_handler(e);
});

test_ui("sort_streams", ({mock_template}) => {
    create_stream_subheader({mock_template});
    // Set subheader flag to false
    pinned_subheader_flag = false;
    active_subheader_flag = false;
    inactive_subheader_flag = false;

    // Get coverage on early-exit.
    stream_list.build_stream_list();

    initialize_stream_data();

    let appended_elems;
    $("#stream_filters").append = (elems) => {
        appended_elems = elems;
    };

    stream_list.build_stream_list(true);

    const $pinned_subheader = $("<pinned-subheader-stub>");
    const $active_subheader = $("<active-subheader-stub>");
    const $inactive_subheader = $("<inactive-subheader-stub>");
    const expected_elems = [
        $pinned_subheader,
        $("<devel-sidebar-row-stub>"),
        $("<Rome-sidebar-row-stub>"),
        $("<test-sidebar-row-stub>"),
        $active_subheader,
        $("<announce-sidebar-row-stub>"),
        $("<Denmark-sidebar-row-stub>"),
        $inactive_subheader,
        $("<cars-sidebar-row-stub>"),
    ];

    assert.deepEqual(appended_elems, expected_elems);
    assert.ok(pinned_subheader_flag);
    assert.ok(active_subheader_flag);
    assert.ok(inactive_subheader_flag);

    const streams = stream_list_sort.get_stream_ids();

    assert.deepEqual(streams, [
        // three groups: pinned, normal, dormant
        develSub.stream_id,
        RomeSub.stream_id,
        testSub.stream_id,
        //
        announceSub.stream_id,
        DenmarkSub.stream_id,
        //
        carSub.stream_id,
    ]);

    const denmark_sub = stream_data.get_sub("Denmark");
    const stream_id = denmark_sub.stream_id;
    assert.ok(stream_list.stream_sidebar.has_row_for(stream_id));
    stream_list.remove_sidebar_row(stream_id);
    assert.ok(!stream_list.stream_sidebar.has_row_for(stream_id));
});

test_ui("separators_only_pinned_and_dormant", ({mock_template}) => {
    // Test only pinned and dormant streams

    create_stream_subheader({mock_template});
    pinned_subheader_flag = false;
    inactive_subheader_flag = false;

    // Get coverage on early-exit.
    stream_list.build_stream_list();

    // pinned streams
    const develSub = {
        name: "devel",
        stream_id: 1000,
        color: "blue",
        pin_to_top: true,
        subscribed: true,
        is_recently_active: true,
    };
    add_row(develSub);

    const RomeSub = {
        name: "Rome",
        stream_id: 2000,
        color: "blue",
        pin_to_top: true,
        subscribed: true,
        is_recently_active: true,
    };
    add_row(RomeSub);
    // dormant stream
    const DenmarkSub = {
        name: "Denmark",
        stream_id: 3000,
        color: "blue",
        pin_to_top: false,
        subscribed: true,
        is_recently_active: false,
    };
    add_row(DenmarkSub);

    let appended_elems;
    $("#stream_filters").append = (elems) => {
        appended_elems = elems;
    };

    stream_list.build_stream_list();

    const $pinned_subheader = $("<pinned-subheader-stub>");
    const $inactive_subheader = $("<inactive-subheader-stub>");
    const expected_elems = [
        $pinned_subheader, // pinned
        $("<devel-sidebar-row-stub>"),
        $("<Rome-sidebar-row-stub>"),
        $inactive_subheader, // dormant
        $("<Denmark-sidebar-row-stub>"),
    ];

    assert.deepEqual(appended_elems, expected_elems);
    assert.ok(pinned_subheader_flag);
    assert.ok(inactive_subheader_flag);
});

test_ui("separators_only_pinned", () => {
    // Test only pinned streams
    // Get coverage on early-exit.
    stream_list.build_stream_list();

    // pinned streams
    const develSub = {
        name: "devel",
        stream_id: 1000,
        color: "blue",
        pin_to_top: true,
        subscribed: true,
    };
    add_row(develSub);

    const RomeSub = {
        name: "Rome",
        stream_id: 2000,
        color: "blue",
        pin_to_top: true,
        subscribed: true,
    };
    add_row(RomeSub);

    let appended_elems;
    $("#stream_filters").append = (elems) => {
        appended_elems = elems;
    };

    stream_list.build_stream_list();
    const expected_elems = [
        // no section sub-header since there is only one section
        $("<devel-sidebar-row-stub>"),
        $("<Rome-sidebar-row-stub>"),
        // no separator at the end as no stream follows
    ];

    assert.deepEqual(appended_elems, expected_elems);
});

test_ui("rename_stream", ({mock_template, override}) => {
    override(user_settings, "web_stream_unreads_count_display_policy", 3);
    override(current_user, "user_id", me.user_id);

    create_stream_subheader({mock_template});
    initialize_stream_data();

    const sub = stream_data.get_sub_by_name("devel");
    const new_name = "Development";

    stream_data.rename_sub(sub, new_name);

    const $li_stub = $.create("li stub");
    $li_stub.length = 0;

    mock_template("stream_sidebar_row.hbs", false, (payload) => {
        assert.deepEqual(payload, {
            name: "Development",
            id: 1000,
            url: "#narrow/channel/1000-Development",
            is_muted: undefined,
            invite_only: undefined,
            is_web_public: undefined,
            color: payload.color,
            pin_to_top: true,
            can_post_messages: true,
            is_empty_topic_only_channel: false,
        });
        return {to_$: () => $li_stub};
    });

    const $subscription_block = $.create("development-block");
    const $unread_count = $.create("development-count");
    const $unread_mention_info = $.create("development-unread-mention-info");
    $li_stub.set_find_results(".subscription_block", $subscription_block);
    $subscription_block.set_find_results(".unread_count", $unread_count);
    $subscription_block.set_find_results(".unread_mention_info", $unread_mention_info);

    stream_list.rename_stream(sub);
    assert.equal($unread_count.text(), "99");

    // Reset for the next initialize_stream_data()
    develSub.name = "devel"; // Resets
});

test_ui("refresh_pin", ({override, override_rewire, mock_template}) => {
    initialize_stream_data();

    const sub = {
        name: "maybe_pin",
        stream_id: 100,
        color: "blue",
        pin_to_top: false,
        can_send_message_group: everyone_group.id,
    };

    stream_data.add_sub(sub);

    const pinned_sub = {
        ...sub,
        pin_to_top: true,
    };

    const $li_stub = $.create("li stub");
    $li_stub.length = 1;

    mock_template("stream_sidebar_row.hbs", false, () => ({to_$: () => $li_stub}));

    override_rewire(stream_list, "update_count_in_dom", noop);
    $("#stream_filters").append = noop;
    $("#streams_header").outerHeight = () => 0;

    let scrolled;
    override(scroll_util, "scroll_element_into_container", ($li) => {
        if ($li === $li_stub) {
            scrolled = true;
        }
    });

    stream_list.refresh_pinned_or_unpinned_stream(pinned_sub);
    assert.ok(scrolled);
});

test_ui("create_initial_sidebar_rows", ({override, override_rewire, mock_template}) => {
    override(user_settings, "web_stream_unreads_count_display_policy", 2); // Test coverage for this setting.
    initialize_stream_data();

    const html_dict = new Map();

    override(stream_list.stream_sidebar, "has_row_for", () => false);
    override(stream_list.stream_sidebar, "set_row", (stream_id, widget) => {
        html_dict.set(stream_id, widget.get_li().html());
    });

    override_rewire(stream_list, "update_count_in_dom", noop);

    mock_template("stream_sidebar_row.hbs", false, (data) => "<div>stub-html-" + data.name);

    // Test this code with stubs above...
    stream_list.create_initial_sidebar_rows();

    assert.equal(html_dict.get(1000), "<div>stub-html-devel");
    assert.equal(html_dict.get(5000), "<div>stub-html-Denmark");
});
