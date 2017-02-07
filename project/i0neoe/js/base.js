;(function () {
    'use strict';

    var $window = $(window);
    var $body = $('body');
    var $form_add_task=$('.add-task');
    var list_content = [];
    var $delete_task;
    var $detail_task;
    var $task_detail = $('.task-detail');
    var $task_list_mask = $('.task-detail-mask');
    var current_index;
    var $update_form;
    var $task_detail_content;
    var $task_detail_content_input;
    var $checkbox_complete;
    var data={};
    var $msg = $('.msg');
    var $msg_content = $msg.find('.msg-content');
    var $msg_confirm = $msg.find('.confirmed');
    var $alerter = $('.alert');

    init();
    
    $form_add_task.on('submit',on_add_task_form_submit);
    $task_list_mask.on('click',hide_task_detail);

    function pop(arg) {
        if(!arg){
            console.error('pop title is required')
        }
        var conf = {};
        var $box;
        var $mask;
        var $title;
        var $content;
        var $confirm;
        var $cancel;
        var dfd;
        var confirmed;
        var timer;

        dfd = $.Deferred();

        if(typeof arg == 'string'){
            conf.title = arg;
        }
        else{
            conf = $.extend(conf, arg)
        }


        $box = $('<div>' +
            '<div class="pop-title">'+ conf.title +'</div>' +
            '<div class="pop-content">' +
            '<div><button style="margin-right: 5px" class="primary confirm">确定</button>' +
            '<button class="cancel">取消</button></div>' +
            '</div>'+
            '</div>').css({
            color:'#444',
            position:'fixed',
            width:300,
            height:'auto',
            padding:'15px 10px',
            background:'#fff',
            'border-radius':3,
            'box-shadow':'0 1px 2px rgba(0,0,0,0.5)',
        });

        $title = $box.find('.pop-title').css({
            padding:'5px 10px',
            'font-weight':900,
            'font-size':20,
            'text-align':'center'
        });

        $content = $box.find('.pop-content').css({
            padding:'5px 10px',
            'font-weight':900,
            'text-align':'center'
        });

        $confirm = $content.find('button.confirm');
        $cancel = $content.find('button.cancel');

        $mask = $('<div></div>').css({
            background:'rgba(0,0,0,0.5)',
            position:'fixed',
            top:0,
            bottom:0,
            left:0,
            right:0
        });

        timer = setInterval(function () {
            if(confirmed !== undefined){
                dfd.resolve(confirmed);
                clearInterval(timer);
                dismiss_pop();
            }

        },50);

        $confirm.on('click',on_confirmed);

        $cancel.on('click',on_cancel);

        $mask.on('click',on_cancel);

        function on_confirmed() {
            confirmed = true;
        }

        function on_cancel() {
            confirmed = false;
        }
        
        function dismiss_pop() {
            $mask.remove();
            $box.remove();
        }
        
        function adjust_box_position() {
            var window_width=$window.width();
            var window_height=$window.height();
            var box_width = $box.width();
            var box_height = $box.height();
            var move_x;
            var move_y;
            move_x = (window_width - box_width)/2;
            move_y = ((window_height - box_height)/2)-20;

            $box.css({
                left:move_x,
                top:move_y,
            })
        }
        $window.on('resize',function () {
            adjust_box_position();
        });

        $mask.appendTo($body);
        $box.appendTo($body);
        $window.resize();
        return dfd.promise();
    }

    function listen_msg_event() {
        $msg_confirm.on('click',function () {
            hide_msg();
        })
    }
    
    function on_add_task_form_submit(e) {
        var new_task = {};
        var $input=$(this).find('input[name=content]');
        //禁用默认行为
        e.preventDefault();
        //获取新task的值
        new_task.content=$input.val();
        //如果新task的值为空，则直接返回，否则继续执行。
        if(!new_task.content) return;
        //存入新task
        if(add_task(new_task)){
            render_task_list();
            $input.val(null);
        };
    }

    //查找并监听所有删除按钮的点击事件
    function listen_task_list() {
        $delete_task.on('click',function () {
            var $this = $(this);
            //找到删除按钮所在的task_item
            var $item = $this.parent().parent();
            var index=$item.data('index');
            //确认删除
            var tmp = pop('确定要删除吗？')
                .then(function (r) {
                    r ? delete_task(index) : null
                });
        });
    }
    /*监听打开Task详情事件*/
    function listen_task_detail(){
        var index ;
        $('.task-item').on('dblclick',function () {
            console.log(1);
            index = $(this).data('index');
            show_task_detail(index);
        })
        $detail_task.on('click',function(){
            var $this = $(this);
            var $item = $this.parent().parent();
            index = $item.data('index');
            show_task_detail(index)
        })
    }
    /*监听完成Task事件*/
    function listen_checkbox_complete() {
        $checkbox_complete.on('click',function () {
            var $this = $(this);
            console.log($this);
           // var is_complete = $this.is(':checked');
           // console.log(is_complete);
            var index = $this.parent().parent().data('index');
            var item = get(index);
            //console.log(item);
            if(item.complete){
                update_task(index,{complete:false});
            }
            else{
                update_task(index,{complete:true});
            }

        })
    }

    function get(index) {
        return store.get('list_content')[index];
    }
    /*查看task详情*/
    function show_task_detail(index) {
        /*生成详情模板*/
        render_task_detail(index);
        current_index = index;
        /*显示详情模板(默认隐藏)*/
        $task_detail.show();
        $task_list_mask.show();
    }

    /*隐藏Task详情*/
    function hide_task_detail() {
        $task_detail.hide();
        $task_list_mask.hide();
    }

    /*更新Task*/
    function update_task(index, data) {
        if(!index || !list_content[index])
            return;
       // console.log(data);
        list_content[index] = $.extend({},list_content[index],data);
       // console.log(list_content[index]);
        refresh_task_list();
    }

    /*渲染制定详细信息*/
    function render_task_detail(index) {
        if(index === undefined || !list_content[index])
            return;
        var item = list_content[index];
         var tpl =
             '<form>' +
                '<div class="content">       <!--任务标题开始-->' +
                (item.content || '') +
                '</div>     <!--任务标题结束-->' +
                 '<div class="input-item">' +
                    '<input style="display: none;" type="text" name="content" value="' +item.content+ '">' +
             '    </div>' +
                '<div>   <!--任务描述开始-->' +
                    '<div class="desc input-item">' +
                        '<textarea name="desc">' + (item.desc || '') + '</textarea>' +
                    '</div>'+
                '</div>      <!--任务描述结束-->' +
                '<div class="remind input-item">    <!--任务提醒开始-->' +
                    '<label>提醒时间</label>'+
                    '<input class="datetime" name="remind_date" type="text" value="' + (item.remind_date || '') + '">' +
                '</div>      <!--任务提醒结束-->' +
                 '<div class="input-item"><button type="submit">更新</button></div>' +
            '</form>';
        /*用新模板替换旧模板*/
        $task_detail.html('');
        $task_detail.html(tpl);

        $('.datetime').datetimepicker();

        /*选择其中的form元素，因为只有会使用其监听submit事件*/
        $update_form = $task_detail.find('form');
        /*选中显示Task内容的元素*/
        $task_detail_content = $update_form.find('.content');
        /*选中显示Task input内容的元素*/
        $task_detail_content_input = $update_form.find('[name = content]');
        /*双击内容元素显示input，隐藏自己*/
        $task_detail_content.on('dblclick',function () {
            console.log(1);
            $task_detail_content_input.show();
            $task_detail_content.hide();
        });

        $update_form.on('submit',function (e) {
            e.preventDefault();
            //var data = {};
            /*获取表单中各个input的值*/
            data.content = $(this).find('[name = content]').val();
            data.desc = $(this).find('[name = desc]').val();
            data.remind_date = $(this).find('[name = remind_date]').val();
            //console.log(data);
            update_task(index,data);
            hide_task_detail();
        })
    }
    

    function init() {
       //store.clear();
        list_content = store.get('list_content')||[];
        listen_msg_event();
        if(list_content.length){
            render_task_list();
            task_remind_check();
        }
    }

    function task_remind_check() {
        var current_timestamp;
        var itl = setInterval(function () {

            for(var i = 0;i < list_content.length; i++){
                var item = get(i);
                //console.log(item);
                var task_timestamp;
                if(!item || !item.remind_date || item.informed){
                   // console.log(item.remind_date);
                    continue;
                }
                current_timestamp = (new Date()).getTime();
                task_timestamp = (new Date(item.remind_date)).getTime();
                console.log(current_timestamp);
                console.log(task_timestamp);
                if(current_timestamp - task_timestamp >= 1){
                    console.log(data);
                    update_task(i , {informed:true});
                    show_msg(item.content);
                }
            }
        },500);

    }

    function show_msg(msg) {
        if(!msg) return;
        $msg_content.html(msg);
        $alerter.get(0).play();
        $msg.show();
    }

    function hide_msg() {
        $msg.hide();
    }

    function add_task(new_task) {
        //将新task推入task_list

        list_content.push(new_task);
        console.log(list_content);
        //更新localstorage
        refresh_task_list();
        return true;
    }

    //刷新localstorage数据并渲染
    function refresh_task_list() {
        store.set('list_content',list_content);
        render_task_list();
       // console.log(1);
    }
    //删除一条task
    function delete_task(index) {
        //如果没有index 或者index不存在则直接返回
        if(index == undefined || !list_content[index]) return;

        delete list_content[index];
        //更新localstorage
        refresh_task_list();
        //render_task_list();
    }
    //渲染全部模板
    function render_task_list() {
        var $task_list = $('.task-list');
        $task_list.html('');
        var complete_items = [];
        for(var i = 0;i < list_content.length;i++){
            var item = list_content[i];
            if(item && item.complete)
            {
                complete_items[i] = item;
            }
            else{
                var $task = render_task_item(item,i);
            }
            $task_list.prepend($task);
        }
       // console.log(complete_items);
        for(var i = 0 ;i<complete_items.length; i++){
            $task = render_task_item(complete_items[i], i);
            if(!$task){
                continue;
            }
            $task.addClass('completed');
            //console.log($task);
            $task_list.append($task);
        }

        $delete_task = $('.action.delete');
        $detail_task = $('.action.detail');
        $checkbox_complete = $('.task-list .complete[type = checkbox]');
        listen_task_list();
        listen_task_detail();
        listen_checkbox_complete();
    }
    //渲染单条task模板！
    function render_task_item(data,index) {
        if(!data || !index) return;
        var list_item_tpl =
            '<div class="task-item" data-index="' + index + '">'+
            '<span><input class="complete" '+(data.complete ? 'checked' : '') +'  type="checkbox"></span>'+
            '<span class="task_content">'+ data.content+'</span>'+
            '<span class="fr">'+
            '<span class="action delete"> 删除</span>'+
            '<span class="action detail"> 详细</span>'+
            '</span>'+
            '</div>';
        return $(list_item_tpl);
        console.log(list_item_tpl);
    }
})();