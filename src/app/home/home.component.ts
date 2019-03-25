import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Inject,
  AfterViewInit,
  OnDestroy
} from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { bufferCount, flatMap, concatMap, delay } from "rxjs/operators";
import { NgxMasonryOptions } from "../ngx-masonry";
import * as dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import { ClientConfig } from "../common/client-config.interface";
import { of } from "rxjs";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements OnInit {
  public masonryOptions: NgxMasonryOptions = {
    transitionDuration: "0.2s",
    gutter: 20,
    resize: true,
    initLayout: true,
    fitWidth: true,
    percentPosition: true,
    prepend: true
  };

  updateMasonryLayout;

  posts = [];
  clientConfig: any = {};

  constructor(public db: AngularFirestore) {}

  ngOnInit() {
    this.db.firestore.doc("configs/client").onSnapshot(snapshot => {
      const dbClientConfig = snapshot.data();

      // reload to properly rerender the masonry after lane size changes
      if (
        this.clientConfig.lanes &&
        this.clientConfig.laness !== dbClientConfig.lanes
      ) {
        window.location.reload();
      }

      this.clientConfig = dbClientConfig;

      this.db
        .collection("posts", ref => ref.orderBy("timestamp", "desc").limit(10))
        .get()
        .toPromise()
        .then(snapshot => {
          const data = snapshot.docs.map(d => d.data());
          this.posts.push(...data);
        })
        .then(() => {
          const {
            displayIntervalSec = 10,
            displayIntervalSize = 5
          } = this.clientConfig;
          this.db
            .collection("posts", ref => ref.orderBy("timestamp", "desc"))
            .stateChanges(["added"])
            .pipe(
              flatMap(actions => actions.map(a => a.payload.doc.data())),
              bufferCount(displayIntervalSize),
              concatMap(val => of(val).pipe(delay(displayIntervalSec * 1000)))
            )
            .subscribe(p => {
              this.posts.push(...p);
            });
        });
    });
  }

  humanDifferenceTime(post) {
    if (post.type === "instagram") {
      return "";
    }

    return dayjs(post.createdAt, "ddd MMM D HH:mm:ssZZ").fromNow();
  }
}
