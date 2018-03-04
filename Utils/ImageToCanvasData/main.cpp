#include <QCoreApplication>
#include <QPainter>
#include <ctime>
#include <vector>
#include <iostream>
#include <QDebug>
#include <fstream>
#include <streambuf>
#include<math.h>
using namespace std;

int main(int argc, char *argv[])
{
    QCoreApplication a(argc, argv);
    QImage img;
    img.load("img.png");
    ofstream out("out.txt");
    for (int x=0;x<img.width();x++) {
        out<<"[";
        for (int y=0;y<img.height();y++) {
            out<<"\""<<img.pixelColor(x,y).name().toStdString()<<"\",";
        }
        out<<"],"<<std::endl;
    }

    return 0;
}
