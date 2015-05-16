
//The view-controller hierarchy is managed by this set of functions.

//Embed a view-controller into a named spot. If spot is null, then it is assumed
//you are referring to the root-spot.
function _embed(vc_name, sp, context) {
  //Lookup VC ctable entry
  var cte = ctable[vc_name];

  //Find the root view name
  var vname = cte.root_view;

  //Get spot names
  var spots = cte.spots;

  //Actions
  var actions = cte.actions;


  //Construct the view
  var base = tels(spots.length);
main_q.push([4, "if_init_view", vname, context, base, spots])
main_q.push([3, "if_controller_init", base, vc_name, context])
main_q.push([2, "if_attach_view", base, sp])

  //TODO: choose action
  var action = Object.keys(cte.actions)[0];

  //Create controller information struct
  var info = {
    context: {},
    action: action,
    cte: cte,
    embeds: [],
  };

  //Register controller base with the struct, we already requested base
  tel_reg_ptr(info, base);

  //Call the on_entry function with the base address
  cte.actions[action].on_entry(base);

  //Register the event handler callback
  reg_evt(base, controller_event_callback);

  return base;
}

//Called when an event is received
function controller_event_callback(ep, event_name, info) {
  //Grab the controller instance
  var inst = tel_deref(ep);

  //Now, get the ctable entry
  var cte = inst.cte;

  //Now find the event handler
  var handler = cte.actions[inst.action].handlers[event_name];
  if (handler !== undefined) {
    handler(ep, info);
  }
}

//Everything to do with dynamic dispatch

//Receive some messages
//Each message is in one flat array
//that has the following format
//[n_args, function_name, *args]
//Here is an example with one call
//  [1, 'print', 'hello world']
//Here is an example with two successive calls
//  [2, 'mul', 3, 4, 1, 'print', 'hello world']
function int_dispatch(q) {
  //Where there is still things left on the queue
  while (q.length > 0) {
    //Grab the first thing off the queue, this is the arg count
    var argc = q.shift();

    //Grab the next thing and look that up in the function table. Pass args left
    this[q.shift()].apply(null, q.splice(0, argc));
  }

  //Now push all of what we can back
  var dump = [];

  //Send main queue
  if (main_q.length > 0) {
    var out = [0];
    for (var i = 0; i < main_q.length; ++i) {
      out.push.apply(out, main_q[i]);
    }
    dump.push(out);
    main_q = [];
  }

  if (net_q.length > 0 && net_q_rem > 0) {
    //Always pick the minimum between the amount remaining and the q length
    var n = net_q.length < net_q_rem ? net_q.length : net_q_rem;

    var out = [1];
    var piece = net_q.splice(0, n);
    for (var i = 0; i < piece.length; ++i) {
      out.push.apply(out, piece[i]);
    }
    dump.push(out);

    net_q_rem -= n;
  }

  if (disk_q.length > 0 && disk_q_rem > 0) {
    //Always pick the minimum between the amount remaining and the q length
    var n = disk_q.length < disk_q_rem ? disk_q.length : disk_q_rem;

    var out = [2];
    var piece = disk_q.splice(0, n);
    for (var i = 0; i < piece.length; ++i) {
      out.push.apply(out, piece[i]);
    }
    dump.push(out);

    disk_q_rem -= n;
  }

  if (cpu_q.length > 0 && cpu_q_rem > 0) {
    //Always pick the minimum between the amount remaining and the q length
    var n = cpu_q.length < cpu_q_rem ? cpu_q.length : cpu_q_rem;

    var out = [3];
    var piece = cpu_q.splice(0, n);
    for (var i = 0; i < piece.length; ++i) {
      out.push.apply(out, piece[i]);
    }
    dump.push(out);

    cpu_q_rem -= n;
  }

  if (gpu_q.length > 0 && gpu_q_rem > 0) {
    //Always pick the minimum between the amount remaining and the q length
    var n = gpu_q.length < gpu_q_rem ? gpu_q.length : gpu_q_rem;

    var out = [4];
    var piece = gpu_q.splice(0, n);
    for (var i = 0; i < piece.length; ++i) {
      out.push.apply(out, piece[i]);
    }
    dump.push(out);

    gpu_q_rem -= n;
  }

  if (dump.length != 0) {
    if_dispatch(dump);
  }
}

function ping() {
main_q.push([0, "pong"])
}

function ping1(arg1) {
main_q.push([1, "pong1", arg1])
}

function ping2(arg1, arg2) {
main_q.push([1, "pong2", arg1])
main_q.push([2, "pong2", arg1, arg2])
}

function ping3(arg1) {
  if (arg1 == "main") {
main_q.push([0, "pong3"])
  } else if (arg1 == "net") {
net_q.push([0, "pong3"])
  } else if (arg1 == "disk") {
disk_q.push([0, "pong3"])
  } else if (arg1 == "cpu") {
cpu_q.push([0, "pong3"])
  } else if (arg1 == "gpu") {
gpu_q.push([0, "pong3"])
  }
}

function ping4(arg1) {
  if (arg1 == "main") {
main_q.push([0, "pong4"])
  } else if (arg1 == "net") {
net_q.push([0, "pong4"])
  } else if (arg1 == "disk") {
disk_q.push([0, "pong4"])
  } else if (arg1 == "cpu") {
cpu_q.push([0, "pong4"])
  } else if (arg1 == "gpu") {
gpu_q.push([0, "pong4"])
  }
}

function ping4_int(arg1) {
  if (arg1 == "main") {
  } else if (arg1 == "net") {
    ++net_q_rem;
  } else if (arg1 == "disk") {
    ++disk_q_rem;
  } else if (arg1 == "cpu") {
    ++cpu_q_rem;
  } else if (arg1 == "gpu") {
    ++gpu_q_rem;
  }
}

//Queue something to be sent out
main_q = [];
net_q = [];
disk_q = [];
cpu_q = [];
gpu_q = [];

//Each queue has a max # of things that can be en-queued
//These are decremented when the message is sent (not just queued)
//and then re-incremented at the appropriate int_* mod entry.
net_q_rem = 5;
disk_q_rem = 5;
cpu_q_rem = 5;
gpu_q_rem = 5;

//Network Callback Related

var tp_to_info = {};

function get_req(owner, url, params, callback) {
  //Even though it's the same function, create a tp because we need to track owner somehow.
  var tp = tel_reg(get_req_callback);
  tp_to_info[tp] = {
    owner: owner,
    callback: callback
  };

  //Create request
net_q.push([4, "if_net_req", "GET", url, params, tp])
}

function get_req_callback(tp, success, info) {
  var _info = tp_to_info[tp];
  if (tel_exists(_info.owner) === true) {
    _info.callback(info);
  }

  tel_del(tp);
  delete tp_to_info[tp];
}

//Support for the telepathy protocol
tel_idx = 0

//Global table linking telepointers to objects (like functions)
tel_table = {};

//This function creates N telepathic pointers and returns the starting index
//of the first pointer returned.  Successive pointers are just increments
//of the base value by one. Should be used as much as possible as it
//reduces the communication overhead (by allowing pipelining on futures), 
//and prevents native pointers from entering the system (which allows more
//interesting abstractions like slaves)
function tels(n) {
  var o = tel_idx;
  tel_idx += n;
  return o;
}

function tel_reg(e) {
  var tp = tels(1);
  tel_table[tp] = e;

  return tp;
}

function tel_reg_ptr(e, tp) {
  tel_table[tp] = e;
}

function tel_del(tp) {
  delete tel_table[tp];
}

function tel_deref(tp) {
  return tel_table[tp];
}

function tel_exists(tp) {
  return tp in tel_table;
}

MODS = ['ui', 'event', 'net', 'segue', 'controller'];
PLATFORM = 'CHROME';
function int_embed_surface(sp) {
}
//Event handler table
evt = {};

function int_event(ep, event_name, info) {
  var f = evt[ep];
  if (f != undefined) {
    f(ep, event_name, info);
  }
}

function reg_evt(ep, f) {
  evt[ep] = f;
}

function dereg_evt(ep) {
  delete evt[ep];
}

//Spec helpers
////////////////////////////////////////////////////////////////
function spec_event_handler(ep, event_name, info) {
main_q.push([3, "if_event", ep, event_name, info])
}
reg_evt(3848392, spec_event_handler);

function int_spec_event_dereg() {
  dereg_evt(3848392);
}
////////////////////////////////////////////////////////////////
function int_net_cb(tp, success, info) {
  //Re-increase
  ++net_q_rem;
  tel_deref(tp)(tp, success, info);
}

//Spec helpers
/////////////////////////////////////////////////////
function get_int_net_cb_spec() {
main_q.push([1, "get_int_net_cb_spec", int_net_cb_spec])
}

//Manually register pointer at special index for testing, int_net_cb
//will call this pointer under test conditions so it's a good test
//for bost telepathy and net
tel_reg_ptr(function(tp, a, b) { int_net_cb_spec = [tp, a, b] }, -3209284741);
/////////////////////////////////////////////////////
//Contains bottom view as key and a the values are also a hash
//that contains the 'top' thing
//{
//  'nav_container' =>
//    {
//      'nav_container' => 'name'
//    }
//}
int_segue_interceptors = {
}

//Contains an array 

//Register a segue intercept
//name - The name of the segue to be given if_segue_do
//from_view_name - The name of the bottom view to intercept
//to_view_name - The name of the top view to intercept

function reg(name, from_view_name, to_view_name) {
  //Create hash if it dosen't already exist
  int_segue_interceptors[from_view_name] = int_segue_interceptors[from_view_name] || {};
  int_segue_interceptors[from_view_name][to_view_name] = name;
}

//Will send the 'if' commands
function intercept_if_necessary(bottom_view_name, top_view_name, from_vp, to_vp) {
  console.log("Intercept if necessars")
  if (int_segue_interceptors[bottom_view_name] && int_segue_interceptors[bottom_view_name][top_view_name]) {
    var rez = int_segue_interceptors[bottom_view_name][top_view_name];

main_q.push([3, "if_segue_do", rez, from_vp, to_vp])
  }
}

reg("modal", "nav_container", "nav_container.detach");
reg("unmodal", "nav_container", "nav_container.attach");