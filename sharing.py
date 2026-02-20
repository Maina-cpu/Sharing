import json
import os
import random
import re
import math
import subprocess
import sys
import textwrap
from typing import Dict, Tuple
import matplotlib.font_manager as fm
from manim import *

from ReadTime import ReadingTimeEstimator

estimator=ReadingTimeEstimator()


IMAGE_FOLDER='H:\\RW\\quiz\\exp'



size=31
bullet=['A)','B)','C)','D)']
bulls=[Text(b,font_size=40) for b in bullet]
exp_time=29-22

with open('Theme.json','r') as thm:
    themes=json.load(thm)

theme=themes[0]
ROBOTO_CONDENSED=fm.findfont(theme["font"])


def make_video(quiz:dict):
    config.pixel_width = 1080
    config.pixel_height = 1920
    config.frame_width = 9
    config.frame_height = 16




    title = quiz["exp"]
    filename = f"{IMAGE_FOLDER}\\{title}.jpg"

    if os.path.exists(filename):
        print('Explanation image found !')
        print('Proceeding...')
    else:
        print('Explanation image not found !')
        return

    colors = theme["tiles"]
    random.shuffle(colors)


    quest=quiz["question"]
    ops = [o for o in quiz["options"]]
    txt = [quest, *ops]
    txt=' '.join(txt)

    read_time = round(estimator.estimate_reading_time(txt,"fast")['total_time'])-10
    print(f'read time: {read_time}')
    if read_time<3:
        read_time=2



    quest = textwrap.fill(quest, width=int(1178 / size))
    quest = quest.split('\n')



    ops = [o for o in quiz["options"]]
    ops = [textwrap.fill(op, width=int(1054 / size)) for op in ops]
    ops = [Text(op, font_size=size, line_spacing=0.6,) for op in ops]

    count = 3 + read_time
    index=quiz["index"]




    keywords={word:'#08CB00' for word in list(set(quiz["keywords"].split()))}
    print(keywords)

    class Video(Scene):
        def construct(self):

            self.camera.background_color = theme["background"]


            global right_m
            question_m = Paragraph(*quest,

                                   font_size=size+1,
                                   line_spacing=0.7,
                                   color=theme["question"],
                                   t2c=keywords,
                                   stroke_color=theme["question_stroke_color"],
                                   stroke_width=theme["question_stroke_width"])

            options = VGroup()
            boxes = VGroup()
            for b, o,c in zip(bulls, ops,colors):
                b.next_to(o, LEFT)
                b.align_to(o, UP)
                tile = VGroup(b, o)
                options.add(tile)
                box = RoundedRectangle(width=8, height=tile.height + 0.4, color=c[1], corner_radius=0.2,
                                       fill_color=c[0], fill_opacity=1, stroke_width=theme["tile_stroke_width"])
                boxes.add(box)

            boxes.arrange(DOWN, buff=0.2)

            boxes.next_to(question_m, DOWN, buff=0.5)
            tiles = VGroup()

            for opt, box in zip(options, boxes):
                opt.move_to(box.get_center())
                opt.align_to(box, LEFT)
                opt.z_index = 2
                tiles.add(VGroup(opt, box))

            circle = Circle(radius=0.4, fill_opacity=1,color=theme["circle_outline"]).set_fill(theme["circle_fill"])
            circle.next_to(question_m, UP, buff=0.6)
            count_m = Integer(count, font_size=56).move_to(circle.get_center())
            counter_mob=VGroup(count_m,circle)
            count_m.z_index = 2
            page = VGroup(question_m, options, *boxes, circle, count_m).move_to(ORIGIN)
            page.shift(UP*0.6)

            self.play(Write(question_m,run_time=0.5))
            self.play(LaggedStart(*[GrowFromCenter(tile) for tile in tiles], lag_ratio=0.2 ))
            self.play(GrowFromCenter(counter_mob,run_time=0.5))

            for i in range(count - 1, 0, -1):
                self.wait(1)
                count_m.set_value(i)
                count_m.move_to(circle.get_center())

            ro = Text(bullet[index][0]).move_to(count_m)
            right_m = tiles[index]

            self.wait(1)

            self.wait(1)
            animations = []

            for i in range(len(tiles)):
                if not i == index:
                    animations.append(tiles[i].animate.set_opacity(0.1))

            # right_m.set_color(YELLOW)

            # reveal the answer

            self.play(Transform(count_m, ro), *animations)
            self.play(Circumscribe(right_m, color=YELLOW, fade_out=True))

            reference=quiz["reference"]
            if reference!='reference':
                reference_mob=Text(reference,font_size=38,color=BLUE).next_to(counter_mob,RIGHT)
                temp=VGroup(counter_mob,reference_mob)
                self.play(Write(reference_mob),temp.animate.move_to([0,counter_mob.get_y(),0]))
                
            
            self.wait(0.5)

            exp_img = ImageMobject(filename)
            exp_img.scale_to_fit_width(config.frame_width)
            exp_img.move_to(ORIGIN)

            self.play(FadeOut(*[page,reference_mob] if reference!='reference'  else page), FadeIn(exp_img))
            self.wait(exp_time)
            
            

            
            self.play(FadeOut(exp_img))


    Video.__name__=title
    return Video


with open("quizzes.json", 'r') as file:
    quizzes = json.load(file)

for qz in quizzes:
    video=make_video(qz)
    globals()[qz["exp"]]=video

if __name__ == '__main__':
    script=os.path.basename(__file__)
    for qz in quizzes:
        subprocess.run(["manim","-pqh",script,qz["exp"]],)











